import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js proxy (middleware): refreshes the Supabase session cookie on every request and sends
 * signed-out visitors of app pages to /login. Marketing pages, /new (chooser), /auth/* and the
 * API stay reachable; API routes check the session themselves and answer 401.
 * Demo mode (NEXT_PUBLIC_DEMO_MODE != "false") has no accounts and skips all of this.
 */
const PROTECTED = ["/dashboard", "/projects", "/settings", "/new/ad", "/new/translate"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demo || !url || !key) return NextResponse.next();

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
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  if (user && AUTH_PAGES.includes(path)) {
    const home = request.nextUrl.clone();
    home.pathname = "/dashboard";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|examples/|demo/|api/inngest|.*\\.(?:png|jpg|jpeg|svg|mp4|mp3|webm|ico)$).*)"],
};
