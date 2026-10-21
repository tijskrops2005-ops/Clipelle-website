import { listProjects } from "@/lib/data/server";
import { apiErrorResponse, authenticateApi, json, toApiProject } from "@/lib/api/v1";

/** GET /api/v1/projects?limit=50: the caller's projects, newest first. */
export async function GET(request: Request) {
  try {
    const caller = await authenticateApi(request);
    const limitRaw = Number(new URL(request.url).searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;
    const projects = await listProjects(caller.userId, limit);
    return json({ projects: projects.map(toApiProject) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
