/** Dev tools are invisible outside development: plain 404, no hint. */
export function devOnly(): Response | null {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }
  return null;
}

/** Maps any thrown error to a JSON response. Messages never contain secrets. */
export function errorResponse(error: unknown, fallbackStatus = 500) {
  const anyErr = error as { message?: string; status?: number; code?: string; name?: string };
  const status =
    typeof anyErr?.status === "number" && anyErr.status >= 400 && anyErr.status < 600
      ? anyErr.status
      : fallbackStatus;
  return Response.json(
    { error: anyErr?.message ?? "Unexpected error.", code: anyErr?.code ?? anyErr?.name },
    { status },
  );
}
