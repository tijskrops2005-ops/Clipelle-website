import { HeygenError } from "@/lib/services/heygen";
import { devOnly, errorResponse as genericErrorResponse } from "../_guard";

export { devOnly };

export function errorResponse(error: unknown) {
  if (error instanceof HeygenError) {
    return Response.json(
      { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  return genericErrorResponse(error);
}
