/**
 * "View as customer" (2 Nov 2026): the cookie an administrator carries while looking at the app as
 * one customer. Browser-safe pure helpers. The cookie value is `<session id>.<expires, unix seconds>`;
 * the proxy reads the expiry to block every write while it is current, the server reads the id and
 * checks the row. Thirty minutes at most.
 */
export const VIEW_COOKIE = "clipelle_view";
export const VIEW_MINUTES = 30;

export type ViewCookie = { id: string; expiresAt: number };

export function encodeViewCookie(id: string, expiresAt: Date) {
  return `${id}.${Math.floor(expiresAt.getTime() / 1000)}`;
}

export function parseViewCookie(value: string | undefined | null, now = Date.now()): ViewCookie | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const expiresAt = Number(value.slice(dot + 1)) * 1000;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(expiresAt)) return null;
  if (expiresAt <= now) return null;
  return { id, expiresAt };
}

/** When a view started now would end. */
export function viewExpiry(startedAt = new Date()) {
  return new Date(startedAt.getTime() + VIEW_MINUTES * 60_000);
}

/** Requests the proxy lets through while viewing: reads, leaving the view, signing out. Everything else that writes is refused. */
export function viewAllowsRequest(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  if (pathname === "/api/admin/view/exit" || pathname === "/api/auth/signout") return true;
  // Customer files are never downloaded while viewing; the player in the page still works.
  if (/^\/api\/projects\/[^/]+\/download/.test(pathname) || pathname === "/api/projects/zip" || pathname.startsWith("/api/settings/export")) return false;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  // Next.js server actions and route handlers that change things all arrive as POST/PATCH/PUT/DELETE.
  return !pathname.startsWith("/api/");
}

/** The message the blocked request answers with. */
export const VIEW_READ_ONLY_MESSAGE = "Read-only while viewing as a customer. Leave the view to make changes.";
