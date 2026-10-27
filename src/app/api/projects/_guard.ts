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

/** While ads are off (config.features.ads), every route that would start one answers 403 with one plain message. */
export const ADS_COMING_SOON = "Ads from a photo or a link are coming soon. Translating a video works today.";
export function adsEnabledOnly(): Response | null {
  if (config.features.ads) return null;
  return Response.json({ error: ADS_COMING_SOON, code: "coming_soon" }, { status: 403 });
}
