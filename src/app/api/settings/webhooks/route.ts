import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { planAllowsApiKeys } from "@/lib/apiKeys";
import { createEndpoint, listDeliveries, listEndpoints, WEBHOOK_EVENTS } from "@/lib/webhooks/outgoing";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

/** Settings → API keys → Webhooks: endpoints (never the secret) and the last deliveries of the workspace. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    const [endpoints, deliveries] = await Promise.all([listEndpoints(scope.workspaceId), listDeliveries(scope.workspaceId)]);
    return Response.json({ endpoints, deliveries, events: WEBHOOK_EVENTS, allowed: await planAllowsApiKeys(scope.workspaceId), role: scope.role });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({ url: z.string().trim().min(12).max(500), events: z.array(z.string()).min(1).max(5) });

/** Adds an endpoint; the secret is returned once. Same gate as API keys (paid plan, team owner). */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    if (scope.workspaceKind === "team" && scope.role !== "owner") return Response.json({ error: "Only the workspace owner can manage webhooks for a team." }, { status: 403 });
    if (!(await planAllowsApiKeys(scope.workspaceId))) return Response.json({ error: "Webhooks come with the API on paid plans. Pick a plan in Billing." }, { status: 402 });
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter an https:// URL and pick at least one event." }, { status: 400 });
    return Response.json(await createEndpoint(scope, parsed.data), { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
