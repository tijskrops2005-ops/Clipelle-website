import type { Presenter, PresenterPage } from "@/lib/types";

/** Demo-mode presenters: placeholders only (no provider calls, no photos). */
export const mockPresenters: Presenter[] = [
  { id: "demo-olivia", name: "Olivia", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true, defaultVoiceId: "demo-en-female-0" },
  { id: "demo-stephanie", name: "Stephanie", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true },
  { id: "demo-diana", name: "Diana", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true },
  { id: "demo-freya", name: "Freya", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true },
  { id: "demo-emma", name: "Emma", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true },
  { id: "demo-betania", name: "Betania", gender: "female", engines: ["avatar_iii", "avatar_iv"], featured: true },
  { id: "demo-marcus", name: "Marcus", gender: "male", engines: ["avatar_iii", "avatar_iv"], featured: false },
  { id: "demo-noah", name: "Noah", gender: "male", engines: ["avatar_iii"], featured: false },
  { id: "demo-claire", name: "Claire", gender: "female", engines: ["avatar_iii"], featured: false },
];

export function mockPresenterPage(params: { engine: "avatar_iii" | "avatar_iv"; gender?: "female" | "male"; page?: number }): PresenterPage {
  const filtered = mockPresenters.filter((p) => p.engines.includes(params.engine) && (!params.gender || p.gender === params.gender));
  const page = params.page ?? 0;
  return { items: filtered.slice(page * 12, (page + 1) * 12), page, hasMore: filtered.length > (page + 1) * 12, defaultId: "demo-olivia" };
}
