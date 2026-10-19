/** Files the browser may upload before a project starts; shared by the sign route, the attach route and the client. */
export const UPLOAD_KINDS = ["image", "source", "background", "logo"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}
