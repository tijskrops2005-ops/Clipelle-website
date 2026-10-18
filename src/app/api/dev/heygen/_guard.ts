import { HeygenError } from "@/lib/services/heygen";

/** Dev tools are invisible outside development: plain 404, no hint. */
export function devOnly(): Response | null {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }
  return null;
}

export function errorResponse(error: unknown) {
  if (error instanceof HeygenError) {
    return Response.json(
      { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return Response.json({ error: message }, { status: 500 });
}
