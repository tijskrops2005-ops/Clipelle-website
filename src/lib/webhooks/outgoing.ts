import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, projects, webhookDeliveries, webhookEndpoints } from "@/lib/db";
import { DataError } from "@/lib/data/errors";
import { assertPublicHost, parsePublicUrl, UrlError, type Lookup } from "@/lib/safeUrl";
import { inngest, webhookDeliveryCreated } from "@/lib/inngest/client";
import { signWebhook, SIGNATURE_HEADER } from "@/lib/webhooks/signature";

/**
 * Outgoing webhooks of the public API (2026-10-21): per workspace up to 10 HTTPS endpoints that
 * receive `project.completed` and `project.failed`. Deliveries are rows (status, attempts, last
 * response) and are sent by an Inngest function with retries and backoff; a delivery can be
 * retried by hand. URLs must be public https (same SSRF rules as the product-page fetcher).
 */
export const WEBHOOK_EVENTS = ["project.completed", "project.failed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export const MAX_ENDPOINTS = 10;

export type Scope = { userId: string; workspaceId: string };

export async function validateEndpointUrl(raw: string, lookup?: Lookup): Promise<string> {
  let url: URL;
  try {
    url = parsePublicUrl(raw);
  } catch (error) {
    throw new DataError(error instanceof UrlError ? error.message : "Enter a full https:// URL.", 400, "bad_url");
  }
  if (url.protocol !== "https:") throw new DataError("Webhook URLs must start with https://.", 400, "bad_url");
  try {
    await assertPublicHost(url, lookup);
  } catch (error) {
    throw new DataError(error instanceof UrlError ? error.message : "That address is not a public website.", 400, "bad_url");
  }
  return url.toString();
}

export async function createEndpoint(scope: Scope, input: { url: string; events: string[] }, lookup?: Lookup) {
  const events = input.events.filter((e): e is WebhookEvent => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (events.length === 0) throw new DataError("Choose at least one event.", 400, "bad_events");
  const url = await validateEndpointUrl(input.url, lookup);
  const existing = await db().select({ id: webhookEndpoints.id }).from(webhookEndpoints).where(eq(webhookEndpoints.workspaceId, scope.workspaceId));
  if (existing.length >= MAX_ENDPOINTS) throw new DataError(`At most ${MAX_ENDPOINTS} webhook endpoints per workspace.`, 400, "too_many");
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const [row] = await db().insert(webhookEndpoints).values({ workspaceId: scope.workspaceId, userId: scope.userId, url, events, secret }).returning();
  return { id: row.id, url: row.url, events: row.events, createdAt: row.createdAt, secret };
}

/** Endpoints of the workspace, never with the secret. */
export async function listEndpoints(workspaceId: string) {
  const rows = await db().select().from(webhookEndpoints).where(eq(webhookEndpoints.workspaceId, workspaceId)).orderBy(desc(webhookEndpoints.createdAt));
  return rows.map((r) => ({ id: r.id, url: r.url, events: r.events, active: r.active, createdAt: r.createdAt, lastDeliveryAt: r.lastDeliveryAt, lastStatus: r.lastStatus }));
}

export async function deleteEndpoint(scope: Scope, id: string) {
  const deleted = await db().delete(webhookEndpoints).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.workspaceId, scope.workspaceId))).returning({ id: webhookEndpoints.id });
  if (deleted.length === 0) throw new DataError("Endpoint not found.", 404, "not_found");
}

export async function listDeliveries(workspaceId: string, limit = 30) {
  const rows = await db().select().from(webhookDeliveries).where(eq(webhookDeliveries.workspaceId, workspaceId)).orderBy(desc(webhookDeliveries.createdAt)).limit(limit);
  return rows.map((r) => ({ id: r.id, endpointId: r.endpointId, event: r.event, projectId: r.projectId, attempt: r.attempt, status: r.status, responseStatus: r.responseStatus, error: r.error, createdAt: r.createdAt, deliveredAt: r.deliveredAt }));
}

/**
 * Called when a project ends (steps.ts): one delivery row per subscribed endpoint of the project's
 * workspace, each handed to the delivery function. Never throws.
 */
export async function enqueueProjectEvent(projectId: string, status: "completed" | "failed") {
  try {
    const [row] = await db().select({ workspaceId: projects.workspaceId, ownerId: projects.ownerId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!row?.workspaceId || !row.ownerId) return;
    const event: WebhookEvent = status === "completed" ? "project.completed" : "project.failed";
    const endpoints = await db().select().from(webhookEndpoints).where(and(eq(webhookEndpoints.workspaceId, row.workspaceId), eq(webhookEndpoints.active, true)));
    const subscribed = endpoints.filter((e) => e.events.includes(event));
    if (subscribed.length === 0) return;
    const { getProject } = await import("@/lib/data/server");
    const { toApiProject } = await import("@/lib/api/v1");
    const project = await getProject(projectId, { userId: row.ownerId, workspaceId: row.workspaceId });
    if (!project) return;
    const data = toApiProject(project) as unknown as Record<string, unknown>;
    for (const endpoint of subscribed) {
      const [delivery] = await db().insert(webhookDeliveries).values({ endpointId: endpoint.id, workspaceId: row.workspaceId, event, projectId, payload: { event, data } }).returning({ id: webhookDeliveries.id });
      await inngest.send(webhookDeliveryCreated.create({ deliveryId: delivery.id }));
    }
  } catch (error) {
    console.error("[webhooks] enqueue failed", error);
  }
}

/** The body as sent: event, delivery id, time, and the project exactly as GET /api/v1/projects/{id} returns it. */
export function deliveryBody(delivery: { id: string; event: string; createdAt: Date; payload: Record<string, unknown> }) {
  return JSON.stringify({ id: delivery.id, event: delivery.event, createdAt: delivery.createdAt.toISOString(), data: delivery.payload.data ?? null });
}

/**
 * One delivery attempt. Returns the outcome; the Inngest function retries on failure. The URL is
 * checked again at send time (DNS can change), redirects are not followed, 10 s limit.
 */
export async function attemptDelivery(deliveryId: string, lookup?: Lookup): Promise<{ ok: boolean; status?: number; error?: string }> {
  const [delivery] = await db().select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId)).limit(1);
  if (!delivery) return { ok: false, error: "Delivery not found." };
  if (delivery.status === "delivered") return { ok: true, status: delivery.responseStatus ?? 200 };
  const [endpoint] = await db().select().from(webhookEndpoints).where(eq(webhookEndpoints.id, delivery.endpointId)).limit(1);
  if (!endpoint || !endpoint.active) {
    await db().update(webhookDeliveries).set({ status: "failed", error: "Endpoint removed or inactive.", updatedAt: new Date() }).where(eq(webhookDeliveries.id, deliveryId));
    return { ok: false, error: "Endpoint removed or inactive." };
  }
  const attempt = delivery.attempt + 1;
  const body = deliveryBody(delivery);
  let outcome: { ok: boolean; status?: number; error?: string };
  try {
    const url = parsePublicUrl(endpoint.url);
    await assertPublicHost(url, lookup);
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/json", "User-Agent": "Clipelle-Webhooks/1", [SIGNATURE_HEADER]: signWebhook(endpoint.secret, body), "X-Clipelle-Event": delivery.event, "X-Clipelle-Delivery": delivery.id },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    outcome = res.status >= 200 && res.status < 300 ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `The endpoint answered ${res.status}.` };
  } catch (error) {
    outcome = { ok: false, error: error instanceof Error ? error.message.slice(0, 300) : "Request failed." };
  }
  await db()
    .update(webhookDeliveries)
    .set({ attempt, status: outcome.ok ? "delivered" : "pending", responseStatus: outcome.status ?? null, error: outcome.error ?? null, deliveredAt: outcome.ok ? new Date() : null, updatedAt: new Date() })
    .where(eq(webhookDeliveries.id, deliveryId));
  await db().update(webhookEndpoints).set({ lastDeliveryAt: new Date(), lastStatus: outcome.ok ? "ok" : (outcome.error ?? "failed"), updatedAt: new Date() }).where(eq(webhookEndpoints.id, endpoint.id));
  return outcome;
}

export async function markDeliveryFailed(deliveryId: string) {
  await db().update(webhookDeliveries).set({ status: "failed", updatedAt: new Date() }).where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.status, "pending")));
}

/** "Retry" in Settings: resets the delivery and hands it to the delivery function again (scoped). */
export async function retryDelivery(scope: Scope, deliveryId: string) {
  const [delivery] = await db().select().from(webhookDeliveries).where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.workspaceId, scope.workspaceId))).limit(1);
  if (!delivery) throw new DataError("Delivery not found.", 404, "not_found");
  await db().update(webhookDeliveries).set({ status: "pending", error: null, updatedAt: new Date() }).where(eq(webhookDeliveries.id, deliveryId));
  await inngest.send(webhookDeliveryCreated.create({ deliveryId }));
}
