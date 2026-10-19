import "server-only";
import { listAllLooks, type AvatarLook } from "@/lib/services/heygen";
import { isPortraitLook } from "@/lib/lookOrientation";
import { workflowSettings } from "@/lib/workflow/settings";
import type { Presenter, PresenterPage } from "@/lib/types";
import type { PresenterEngine } from "@/lib/pricing";

/**
 * The presenter catalogue for the customer picker: portrait public looks (studio avatars and
 * digital twins), fetched with free listing calls and cached in memory for 15 minutes.
 * Customers see names and photos only; "HeyGen", engine and look ids never appear as text.
 */

/** Shown first in the picker (chosen 2026-10-19 for the target audience: women 25–40, elegant). */
export const FEATURED_LOOK_IDS = [
  "d365dda368044f6189ee68af637389ff", // Olivia (default)
  "7ff6a5e83a864eb9a2560bc967ef2876", // Stephanie
  "3e5d7c980b4146f3947806b917d54c32", // Diana
  "e97bd13f43bd460c8fb5fa27eeb294f9", // Freya
  "8cc13046e1e74523980c8054e994652b", // Emma
  "fae9bd523ffe4020a9342f1a1307ea91", // Betania
];

const CACHE_MS = 15 * 60 * 1000;
type Cache = { at: number; items: Presenter[] };
const g = globalThis as unknown as { __reelayPresenters?: Cache | Promise<Cache> };

function toPresenter(l: AvatarLook): Presenter {
  const gender = (l.gender ?? "").toLowerCase();
  const engines = (l.supported_api_engines ?? []).filter((e): e is PresenterEngine => e === "avatar_iii" || e === "avatar_iv");
  return {
    id: l.id,
    name: l.name,
    gender: gender === "female" || gender === "male" ? gender : "other",
    previewUrl: l.preview_image_url ?? undefined,
    engines: engines.length ? engines : ["avatar_iii", "avatar_iv"],
    featured: FEATURED_LOOK_IDS.includes(l.id),
  };
}

async function load(): Promise<Cache> {
  const [studio, twins] = await Promise.all([listAllLooks("studio_avatar"), listAllLooks("digital_twin")]);
  const seen = new Set<string>();
  const items = [...twins, ...studio]
    .filter((l) => isPortraitLook(l) && l.preview_image_url && !seen.has(l.id) && seen.add(l.id))
    .map(toPresenter);
  // Featured first, in the curated order; the rest keep the provider's order.
  items.sort((a, b) => (a.featured === b.featured ? (a.featured ? FEATURED_LOOK_IDS.indexOf(a.id) - FEATURED_LOOK_IDS.indexOf(b.id) : 0) : a.featured ? -1 : 1));
  return { at: Date.now(), items };
}

export async function getPresenterCatalogue(): Promise<Presenter[]> {
  const cached = g.__reelayPresenters;
  if (cached && !(cached instanceof Promise) && Date.now() - cached.at < CACHE_MS) return cached.items;
  if (cached instanceof Promise) return (await cached).items;
  const pending = load();
  g.__reelayPresenters = pending;
  try {
    const result = await pending;
    g.__reelayPresenters = result;
    return result.items;
  } catch (error) {
    g.__reelayPresenters = undefined;
    throw error;
  }
}

export function defaultPresenterId() {
  return workflowSettings.heygenLookId || FEATURED_LOOK_IDS[0];
}

export async function listPresenters(params: { engine: PresenterEngine; gender?: "female" | "male"; page?: number; pageSize?: number }): Promise<PresenterPage> {
  const all = await getPresenterCatalogue();
  const filtered = all.filter((p) => p.engines.includes(params.engine) && (!params.gender || p.gender === params.gender));
  const pageSize = params.pageSize ?? 12;
  const page = Math.max(0, params.page ?? 0);
  const items = filtered.slice(page * pageSize, (page + 1) * pageSize);
  return { items, page, hasMore: filtered.length > (page + 1) * pageSize, defaultId: defaultPresenterId() };
}
