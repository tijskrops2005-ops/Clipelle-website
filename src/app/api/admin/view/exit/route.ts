import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { config } from "@/lib/config";
import { endView } from "@/lib/adminView";
import { VIEW_COOKIE } from "@/lib/adminViewSession";

/** Leave the customer view: closes the session, clears the cookie, writes the audit log. The proxy lets this through while viewing. */
export async function POST(request: Request) {
  const user = config.demoMode ? null : await getUser();
  if (!user || !isAdmin(user.email)) return new Response(null, { status: 404 });
  const { customerId } = await endView(user, request);
  const res = Response.json({ ok: true, customerId });
  res.headers.append("Set-Cookie", `${VIEW_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return res;
}
