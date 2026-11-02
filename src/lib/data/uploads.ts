/** Files the browser may upload before a project starts; shared by the sign route, the attach route and the client. */
export const UPLOAD_KINDS = ["image", "source", "background", "logo"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}

/**
 * A file uploaded as soon as it was picked (2 Nov 2026, "staged"): it waits under the user's own
 * storage folder until the project attaches it, so a form draft can bring it back after a refresh.
 */
export type StagedUpload = { path: string; fileName: string; bytes: number; mime: string; seconds?: number };
