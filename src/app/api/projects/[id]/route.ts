import { connection } from "next/server";
import { z } from "zod";
import { dataErrorResponse, getProject, updateProjectMeta } from "@/lib/data/server";
import { readJson } from "../_guard";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly } from "../_guard";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const { id } = await ctx.params;
  try {
    const scope = await requireScope();
    const project = await getProject(id, scope);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json(project);
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Patch = z.object({ name: z.string().trim().min(2).max(120).optional(), tags: z.array(z.string().trim().max(30)).max(10).optional(), archived: z.boolean().optional() });

/** Rename, tag, archive or unarchive. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const scope = await requireScope();
    const parsed = Patch.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "A name of 2 to 120 characters, up to 10 tags of 30 characters." }, { status: 400 });
    await updateProjectMeta(scope, id, parsed.data);
    return Response.json(await getProject(id, scope));
  } catch (error) {
    return dataErrorResponse(error);
  }
}
