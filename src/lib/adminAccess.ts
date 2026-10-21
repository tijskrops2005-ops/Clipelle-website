/** Who may open /admin: the comma-separated addresses in ADMIN_EMAILS. Browser-safe (no secrets), used by the proxy and the server. */
export function adminEmails(env: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (env ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
export function isAdmin(email: string | null | undefined, list = adminEmails()) {
  return Boolean(email) && list.includes(email!.trim().toLowerCase());
}
