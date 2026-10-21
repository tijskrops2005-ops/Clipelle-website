import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { createApiKey, listApiKeys, planAllowsApiKeys } from "@/lib/apiKeys";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    return Response.json({ keys: await listApiKeys(user.id), allowed: await planAllowsApiKeys(user.id) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({ name: z.string().trim().min(1).max(60) });

/** Creates a key and returns it once. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Give the key a name (1–60 characters)." }, { status: 400 });
    return Response.json(await createApiKey(user.id, parsed.data.name), { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
