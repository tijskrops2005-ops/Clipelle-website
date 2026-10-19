import { connection } from "next/server";
import { devHello, inngest } from "@/lib/inngest/client";
import { devOnly, errorResponse } from "../_guard";

const DEV_SERVER = process.env.INNGEST_DEV_SERVER_URL?.trim() || "http://localhost:8288";

/** Free: sends the smoke-test event. Returns the event id so the page can follow the run. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: { name?: string; failOnce?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  try {
    const { ids } = await inngest.send(devHello.create({ name: body.name?.trim() || "Tijs", failOnce: body.failOnce === true }));
    return Response.json({ eventId: ids[0], sentAt: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Free: the runs of one event, read from the local Inngest dev server (not available in production). */
export async function GET(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  const eventId = new URL(request.url).searchParams.get("eventId");
  try {
    const health = await fetch(`${DEV_SERVER}/health`, { cache: "no-store" }).then((r) => r.ok).catch(() => false);
    if (!health) return Response.json({ devServer: false, runs: [] });
    if (!eventId) return Response.json({ devServer: true, runs: [] });
    const r = await fetch(`${DEV_SERVER}/v1/events/${encodeURIComponent(eventId)}/runs`, { cache: "no-store" });
    const b = (await r.json()) as { data?: { run_id: string }[] };
    // The per-event list reports the status of the *last attempt* ("Failed" while a retry is pending);
    // the run endpoint has the live status of the run as a whole.
    const runs = await Promise.all(
      (b.data ?? []).map(async (x) => {
        const d = await fetch(`${DEV_SERVER}/v1/runs/${encodeURIComponent(x.run_id)}`, { cache: "no-store" });
        const j = (await d.json()) as { data?: { status: string; output?: unknown; started_at?: string; ended_at?: string | null } };
        const run: { status?: string; output?: unknown; started_at?: string; ended_at?: string | null } = j.data ?? {};
        return { runId: x.run_id, status: run.status ?? "Unknown", output: run.output ?? null, startedAt: run.started_at ?? null, endedAt: run.ended_at ?? null };
      }),
    );
    return Response.json({ devServer: true, runs });
  } catch (error) {
    return errorResponse(error);
  }
}
