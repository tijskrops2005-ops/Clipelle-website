import { getProject } from "@/lib/data/server";
import { ApiError, apiErrorResponse, authenticateApi, json, toApiProject } from "@/lib/api/v1";

/** GET /api/v1/projects/{id}: one project with fresh signed result links. Someone else's project is a 404. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const caller = await authenticateApi(request);
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found", "Project not found.", 404);
    const project = await getProject(id, caller.userId);
    if (!project) throw new ApiError("not_found", "Project not found.", 404);
    return json({ project: toApiProject(project) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
