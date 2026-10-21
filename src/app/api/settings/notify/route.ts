import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { addNotifyWish, getOrCreateProfile, listNotifyWishes } from "@/lib/data/profile";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export const CONNECTION_FEATURES = ["publish_tiktok", "publish_instagram", "publish_youtube", "shopify_import"] as const;
const Body = z.object({ feature: z.enum(CONNECTION_FEATURES) });

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    return Response.json({ features: await listNotifyWishes(user.id) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** "Notify me": stores only the wish. No OAuth, no publishing. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Unknown feature." }, { status: 400 });
    await getOrCreateProfile(user);
    await addNotifyWish(user.id, parsed.data.feature);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
