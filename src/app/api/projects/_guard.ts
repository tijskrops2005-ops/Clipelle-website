import { config } from "@/lib/config";

/** In demo mode the real project routes do not exist: the UI never calls them and nothing should. */
export function databaseModeOnly(): Response | null {
  if (config.demoMode) return Response.json({ error: "Demo mode is on; real projects are disabled. Set NEXT_PUBLIC_DEMO_MODE=false to use the database." }, { status: 404 });
  return null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
