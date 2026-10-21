import { desc } from "drizzle-orm";
import { db, webhookEvents } from "@/lib/db";
import { heygenFetch } from "@/lib/services/heygen";
import { callbackBaseUrl } from "@/lib/webhooks/incoming";
import { devOnly, errorResponse } from "../_guard";

const HEYGEN_EVENTS = ["avatar_video.success", "avatar_video.fail", "video_translate.success", "video_translate.fail"];
type Endpoint = { endpoint_id: string; url: string; events: string[] | null; status: string; created_at?: string; secret?: string | null };

/** Dev only: the registered HeyGen endpoints (free call) and the last incoming events of every provider. */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  try {
    const events = await db().select().from(webhookEvents).orderBy(desc(webhookEvents.receivedAt)).limit(30);
    let endpoints: Endpoint[] = [];
    let endpointsError: string | null = null;
    try {
      const data = await heygenFetch<{ endpoints?: Endpoint[]; items?: Endpoint[] } | Endpoint[]>("/v3/webhooks/endpoints");
      endpoints = Array.isArray(data) ? data : (data.endpoints ?? data.items ?? []);
    } catch (error) {
      endpointsError = error instanceof Error ? error.message : "Could not list endpoints.";
    }
    return Response.json({ base: callbackBaseUrl(), heygenEvents: HEYGEN_EVENTS, endpoints: endpoints.map((e) => ({ ...e, secret: undefined })), endpointsError, events: events.map((e) => ({ id: e.id, provider: e.provider, externalId: e.externalId, eventType: e.eventType, receivedAt: e.receivedAt })) });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Dev only: registers our HeyGen endpoint (APP_BASE_URL must be a public https URL). The secret is
 * returned once by HeyGen and shown once here; it goes into HEYGEN_WEBHOOK_SECRET by hand. Free call.
 */
export async function POST() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const base = callbackBaseUrl();
  if (!base) return Response.json({ error: "Set APP_BASE_URL to a public https URL first (a tunnel during development). Without it the jobs poll, which also works." }, { status: 400 });
  try {
    const created = await heygenFetch<Endpoint>("/v3/webhooks/endpoints", { method: "POST", body: JSON.stringify({ url: `${base}/api/webhooks/heygen`, events: HEYGEN_EVENTS }) });
    return Response.json({ endpoint: { ...created, secret: undefined }, secret: created.secret ?? null, note: "Copy the secret into HEYGEN_WEBHOOK_SECRET in .env.local now; it is not shown again." }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
