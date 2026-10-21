import { getRender } from "@/lib/services/finalEdit";
import { acceptProviderEvent } from "@/lib/webhooks/incoming";

/** Shotstack render callback. Payloads are not signed, so the render is re-read through the API first. */
export async function POST(request: Request) {
  let body: { id?: string; status?: string; type?: string; action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body.id || typeof body.id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(body.id)) return Response.json({ received: true, ignored: "no id" });
  let render: { status: string };
  try {
    render = await getRender(body.id);
  } catch {
    return new Response("Could not verify", { status: 502 });
  }
  const status = render.status === "done" ? "completed" : render.status === "failed" ? "failed" : null;
  if (!status) return Response.json({ received: true, ignored: render.status });
  const result = await acceptProviderEvent("shotstack", body.id, `render.${render.status}`, status, { id: body.id, status: render.status, type: body.type, action: body.action });
  return Response.json({ received: true, ...result });
}
