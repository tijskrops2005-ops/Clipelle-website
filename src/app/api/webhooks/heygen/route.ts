import { acceptProviderEvent, verifyHeygenSignature } from "@/lib/webhooks/incoming";

/**
 * HeyGen webhook (registered endpoint; secret in HEYGEN_WEBHOOK_SECRET). Signature = hex HMAC-SHA256
 * of the raw body. Wakes the waiting job; the job re-reads the video through the API.
 */
export async function POST(request: Request) {
  const secret = process.env.HEYGEN_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const raw = await request.text();
  if (!verifyHeygenSignature(raw, request.headers.get("signature"), secret)) return new Response("Invalid signature", { status: 401 });
  let event: { event_type?: string; event_data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const type = typeof event.event_type === "string" ? event.event_type : "";
  const data = event.event_data ?? {};
  const id = [data.video_id, data.video_translation_id, data.video_translate_id, data.id].find((v): v is string => typeof v === "string" && v.length > 0);
  if (!type || !id) return Response.json({ received: true, ignored: "no id" });
  const status = type.endsWith(".success") ? "completed" : type.endsWith(".fail") ? "failed" : null;
  if (!status) return Response.json({ received: true, ignored: type });
  const result = await acceptProviderEvent("heygen", id, type, status, event as Record<string, unknown>);
  return Response.json({ received: true, ...result });
}
