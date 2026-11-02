import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { requestDeletion } from "@/lib/accountLifecycle";
import { supabaseServer } from "@/lib/supabase/ssr";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";
import { VIEW_READ_ONLY_MESSAGE } from "@/lib/adminViewSession";

const Body = z.object({ confirmEmail: z.string().trim().toLowerCase() });

/** Close the account (2 Nov 2026): scheduled removal in 30 days, subscription cancelled at the period end, keys revoked, running projects stopped, then sign out. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    if (scope.readOnly) return Response.json({ error: VIEW_READ_ONLY_MESSAGE }, { status: 403 });
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success || parsed.data.confirmEmail !== scope.user.email.toLowerCase()) return Response.json({ error: "Type your e-mail address exactly as it is on the account." }, { status: 400 });
    const { deletionAt } = await requestDeletion(scope.user);
    const supabase = await supabaseServer();
    await supabase.auth.signOut().catch(() => undefined);
    return Response.json({ ok: true, deletionAt: deletionAt.toISOString() });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
