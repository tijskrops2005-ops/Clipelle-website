import { config } from "@/lib/config";
import { HeygenError } from "@/lib/services/heygen";
import { isPlanRestriction } from "@/lib/services/translate";
import { devOnly, errorResponse as genericErrorResponse } from "../_guard";

export { devOnly };

/** Every translate route refuses without the rights confirmation (rule 7 in CLAUDE.md). */
export function requireRights(value: unknown): Response | null {
  if (value === true || value === "true") return null;
  return Response.json(
    {
      error: `Confirm the rights first: "${config.rightsConfirmationText}" Without that confirmation no translation starts.`,
      code: "rights_required",
    },
    { status: 400 },
  );
}

export function errorResponse(error: unknown) {
  if (isPlanRestriction(error)) {
    return Response.json(
      {
        error:
          "HeyGen refused this step for your account. Editing the translated subtitles before the render seems to need a higher plan (Enterprise). Without it, only a translation without correction is possible.",
        code: "plan_required",
        detail: (error as HeygenError).message,
      },
      { status: 403 },
    );
  }
  if (error instanceof HeygenError) {
    return Response.json(
      { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  return genericErrorResponse(error);
}
