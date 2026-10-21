import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { deleteAccountData, getOrCreateProfile, updateProfileName } from "@/lib/data/profile";
import { supabaseAdmin } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/ssr";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const profile = await getOrCreateProfile(user);
    return Response.json({ email: user.email, name: profile.name ?? user.name ?? "", emailVerified: user.emailVerified, planKey: profile.planKey, freeAdGrantedAt: profile.freeAdGrantedAt });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Patch = z.object({ name: z.string().trim().max(120) });

export async function PATCH(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const parsed = Patch.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter a name of at most 120 characters." }, { status: 400 });
    await getOrCreateProfile(user);
    await updateProfileName(user.id, parsed.data.name || null);
    const supabase = await supabaseServer();
    await supabase.auth.updateUser({ data: { name: parsed.data.name || null } });
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Deletes the account and everything in it. The body must repeat the e-mail address. */
export async function DELETE(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const body = await readJson<{ confirmEmail?: string }>(request);
    if (body?.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()) return Response.json({ error: "Type your e-mail address exactly to confirm." }, { status: 400 });
    await deleteAccountData(user.id);
    const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
    if (error) return Response.json({ error: "Your data was removed but the sign-in could not be deleted yet. Contact us." }, { status: 500 });
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
