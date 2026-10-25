import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishableKey, supabaseUrl } from "@/lib/supabase/server";

/**
 * Supabase client bound to the request's auth cookies (server components, route handlers,
 * server actions). It only talks to Auth: the Data API roles have no table grants, so even a
 * signed-in session cannot read tables through it; all data goes through Drizzle with our own
 * ownership checks (src/lib/auth.ts + src/lib/data/server.ts).
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  // Reading the session is request-time by definition, and the auth client checks token expiry
  // against the clock. Saying so here (instead of in every page) keeps Cache Components from
  // flagging `Date.now()` during prerendering: layouts and pages render in parallel, so the
  // app shell's own connection() does not cover a page that reads the user itself.
  await connection();
  const store = await cookies();
  return createServerClient(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          // Server components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
