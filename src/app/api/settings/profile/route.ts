import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile, updateNotifyEmail, updateProfileName } from "@/lib/data/profile";
import { supabaseServer } from "@/lib/supabase/ssr";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const profile = await getOrCreateProfile(user);
    return Response.json({ email: user.email, name: profile.name ?? user.name ?? "", emailVerified: user.emailVerified, planKey: profile.planKey, freeAdGrantedAt: profile.freeAdGrantedAt, notifyEmail: profile.notifyEmail });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Patch = z.object({ name: z.string().trim().max(120).optional(), notifyEmail: z.boolean().optional() });

export async function PATCH(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const parsed = Patch.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter a name of at most 120 characters." }, { status: 400 });
    await getOrCreateProfile(user);
    if (parsed.data.name !== undefined) {
      await updateProfileName(user.id, parsed.data.name || null);
      const supabase = await supabaseServer();
      await supabase.auth.updateUser({ data: { name: parsed.data.name || null } });
    }
    if (parsed.data.notifyEmail !== undefined) await updateNotifyEmail(user.id, parsed.data.notifyEmail);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Deletes the account and everything in it. The body must repeat the e-mail address. */
/** Close the account (2 Nov 2026, was a hard delete): scheduled removal in 30 days; see /api/settings/account/delete. */
export async function DELETE(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const body = await readJson<{ confirmEmail?: string }>(request);
    if ((body?.confirmEmail ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return Response.json({ error: "Type your e-mail address exactly as it is on the account." }, { status: 400 });
    const { requestDeletion } = await import("@/lib/accountLifecycle");
    const { deletionAt } = await requestDeletion(user);
    const supabase = await supabaseServer();
    await supabase.auth.signOut().catch(() => undefined);
    return Response.json({ ok: true, deletionAt: deletionAt.toISOString() });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
