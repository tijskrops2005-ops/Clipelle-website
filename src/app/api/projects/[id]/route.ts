import { connection } from "next/server";
import { dataErrorResponse, getProject } from "@/lib/data/server";
import { databaseModeOnly } from "../_guard";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const { id } = await ctx.params;
  try {
    const project = await getProject(id);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json(project);
  } catch (error) {
    return dataErrorResponse(error);
  }
}
