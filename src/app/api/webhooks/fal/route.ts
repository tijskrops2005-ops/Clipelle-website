import { acceptProviderEvent, fetchFalJwks, verifyFalSignature } from "@/lib/webhooks/incoming";

/** fal.ai queue webhook (`webhookUrl` on submit). ED25519 signature over the four headers and the body hash. */
export async function POST(request: Request) {
  const raw = new Uint8Array(await request.arrayBuffer());
  const headers = {
    requestId: request.headers.get("x-fal-webhook-request-id"),
    userId: request.headers.get("x-fal-webhook-user-id"),
    timestamp: request.headers.get("x-fal-webhook-timestamp"),
    signature: request.headers.get("x-fal-webhook-signature"),
  };
  let keys;
  try {
    keys = await fetchFalJwks();
  } catch {
    return new Response("Keys unavailable", { status: 503 });
  }
  if (!verifyFalSignature(raw, headers, keys)) return new Response("Invalid signature", { status: 401 });
  let body: { request_id?: string; status?: string };
  try {
    body = JSON.parse(Buffer.from(raw).toString("utf8")) as typeof body;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body.request_id) return Response.json({ received: true, ignored: "no id" });
  const status = body.status === "OK" ? "completed" : body.status === "ERROR" ? "failed" : null;
  if (!status) return Response.json({ received: true, ignored: body.status });
  const result = await acceptProviderEvent("fal", body.request_id, `queue.${body.status}`, status, { request_id: body.request_id, status: body.status });
  return Response.json({ received: true, ...result });
}
