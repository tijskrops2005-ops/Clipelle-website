import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/adminAccess";
import { mfaBlocksApi, mfaRedirectsPage, mfaVerifyNeeded, MFA_REQUIRED_MESSAGE } from "@/lib/mfaGate";
import { parseViewCookie, viewAllowsRequest, VIEW_COOKIE, VIEW_READ_ONLY_MESSAGE } from "@/lib/adminViewSession";

/** A partner or referral code on the first visit (`?ref=`, `?via=`), kept 90 days and stored at sign-up. */
const REF_COOKIE = "clipelle_ref";
function referralParam(request: NextRequest) {
  const v = request.nextUrl.searchParams.get("ref") ?? request.nextUrl.searchParams.get("via");
  return v && /^[A-Za-z0-9_-]{2,64}$/.test(v) ? v : null;
}
function rememberReferral(request: NextRequest, response: NextResponse) {
  const ref = referralParam(request);
  if (ref && !request.cookies.get(REF_COOKIE)) response.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: 90 * 24 * 3600, sameSite: "lax" });
  return response;
}

/**
 * Next.js proxy (middleware): refreshes the Supabase session cookie on every request and sends
 * signed-out visitors of app pages to /login. Marketing pages, /new (chooser), /auth/* and the
 * API stay reachable; API routes check the session themselves and answer 401.
 * Demo mode (NEXT_PUBLIC_DEMO_MODE != "false") has no accounts and skips all of this.
 */
const PROTECTED = ["/dashboard", "/projects", "/batches", "/admin", "/settings", "/new/ad", "/new/url", "/new/translate"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Developer tools exist only in development. Outside it they answer a bare 404 here, before any
  // rendering: the pages' own notFound() would still stream a 200 with the not-found UI (and the
  // page title) once the static shell has been sent.
  const path = request.nextUrl.pathname;
  if (process.env.NODE_ENV !== "development" && (path === "/dev" || path.startsWith("/dev/") || path.startsWith("/api/dev/"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  // Language preference (cookie set only after a cookie choice): the root goes to /nl when the visitor chose Dutch.
  const lang = request.cookies.get("clipelle_lang")?.value ?? request.cookies.get("reelay_lang")?.value;
  if (request.nextUrl.pathname === "/" && lang === "nl") {
    const nl = request.nextUrl.clone();
    nl.pathname = "/nl";
    const redirect = NextResponse.redirect(nl);
    // A preference stored under the pre-rename cookie name is carried over once.
    if (!request.cookies.get("clipelle_lang") && lang) redirect.cookies.set("clipelle_lang", lang, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
    return redirect;
  }
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demo || !url || !key) return rememberReferral(request, NextResponse.next());

  // "View as customer" (2 Nov 2026): while an administrator looks at the app as a customer, every
  // request that could change something, and every file download, is refused here, before any code runs.
  const view = parseViewCookie(request.cookies.get(VIEW_COOKIE)?.value);
  if (view && !viewAllowsRequest(request.method, path)) {
    return path.startsWith("/api/") ? NextResponse.json({ error: VIEW_READ_ONLY_MESSAGE, code: "read_only_view" }, { status: 403 }) : new NextResponse(VIEW_READ_ONLY_MESSAGE, { status: 403 });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const c of list) request.cookies.set(c.name, c.value);
        response = NextResponse.next({ request });
        for (const c of list) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // The admin area exists only for the addresses in ADMIN_EMAILS: everyone else, signed in or not,
  // gets a bare 404 here, before any rendering (a notFound() inside the page would answer 200).
  if ((path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")) && !isAdmin(user?.email)) {
    return new NextResponse(null, { status: 404 });
  }

  // Two-step verification (2 Nov 2026): an account with an authenticator finishes signing in with its
  // code before any app page or app API call; the level comes from the session itself (no network).
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaVerifyNeeded(aal?.currentLevel, aal?.nextLevel)) {
      if (mfaBlocksApi(path)) return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "mfa_required" }, { status: 401 });
      if (mfaRedirectsPage(path, PROTECTED)) {
        const verify = request.nextUrl.clone();
        verify.pathname = "/verify-2fa";
        verify.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
        return NextResponse.redirect(verify);
      }
    }
  }

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  if (user && AUTH_PAGES.includes(path)) {
    // Already signed in: go where the link was heading (?next=, own paths only), else the dashboard.
    const wanted = request.nextUrl.searchParams.get("next");
    const target = wanted && wanted.startsWith("/") && !wanted.startsWith("//") && !wanted.startsWith("/\\") ? new URL(wanted, request.nextUrl.origin) : null;
    const home = request.nextUrl.clone();
    home.pathname = target?.pathname ?? "/dashboard";
    home.search = target?.search ?? "";
    return NextResponse.redirect(home);
  }
  return rememberReferral(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known/|examples/|demo/|api/inngest|.*\\.(?:png|jpg|jpeg|svg|mp4|mp3|webm|ico)$).*)"],
};
