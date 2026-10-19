import "server-only";
import { listVoices, type Voice } from "@/lib/services/heygen";
import { ACCENTS, AD_LANGUAGES, AD_LANGUAGE_CODES, accentOf, type AdLanguageCode, type VoiceOption, type VoiceOptions } from "@/lib/voiceOptions";

/**
 * Public HeyGen voices, fetched with free listing calls and cached in memory for 15 minutes.
 * Language names in the list are messy ("English", "en", "Filipino ", "", "unknown"), so they are
 * normalised here; voices without a usable language are left out.
 */

const CACHE_MS = 15 * 60 * 1000;
type Cache = { at: number; byLanguage: Map<AdLanguageCode, Voice[]> };
const g = globalThis as unknown as { __reelayVoices?: Cache | Promise<Cache> };

const NAME_TO_CODE: Record<string, AdLanguageCode> = Object.fromEntries(
  Object.entries(AD_LANGUAGES).flatMap(([code, l]) => [[l.heygenName.toLowerCase(), code as AdLanguageCode], [code, code as AdLanguageCode]]),
);

function codeOf(v: Voice): AdLanguageCode | undefined {
  const raw = (v.language ?? "").trim().toLowerCase();
  return NAME_TO_CODE[raw];
}

async function load(): Promise<Cache> {
  // One paginated listing per language we offer (free; 1–21 calls each, 100 per page).
  const byLanguage = new Map<AdLanguageCode, Voice[]>();
  for (const code of AD_LANGUAGE_CODES) {
    const items = await listVoices({ language: AD_LANGUAGES[code].heygenName, limit: 100, all: true });
    byLanguage.set(code, items.filter((v) => codeOf(v) === code && v.voice_id));
  }
  return { at: Date.now(), byLanguage };
}

async function catalogue(): Promise<Cache> {
  const cached = g.__reelayVoices;
  if (cached && !(cached instanceof Promise) && Date.now() - cached.at < CACHE_MS) return cached;
  if (cached instanceof Promise) return cached;
  const pending = load();
  g.__reelayVoices = pending;
  try {
    const result = await pending;
    g.__reelayVoices = result;
    return result;
  } catch (error) {
    g.__reelayVoices = undefined;
    throw error;
  }
}

function toOption(v: Voice, language: AdLanguageCode): VoiceOption {
  const gender = (v.gender ?? "").toLowerCase();
  return { id: v.voice_id, name: v.name.trim(), gender: gender === "female" || gender === "male" ? gender : "other", previewUrl: v.preview_audio_url ?? undefined, accent: accentOf(v.name, language) };
}

export async function listVoiceOptions(params: { language: AdLanguageCode; accent?: string; gender?: "female" | "male"; lookVoiceId?: string; limit?: number }): Promise<VoiceOptions> {
  const { byLanguage } = await catalogue();
  const languages = AD_LANGUAGE_CODES.map((code) => ({ code, label: AD_LANGUAGES[code].label, voices: byLanguage.get(code)?.length ?? 0 })).filter((l) => l.voices > 0);
  const all = (byLanguage.get(params.language) ?? []).map((v) => toOption(v, params.language));
  const accentCounts = new Map<string, number>();
  for (const v of all) if (v.accent) accentCounts.set(v.accent, (accentCounts.get(v.accent) ?? 0) + 1);
  const accents = [...accentCounts.entries()].map(([key, n]) => ({ key, label: ACCENTS[params.language].find((a) => a.key === key)?.label ?? key, voices: n }));
  let voices = all.filter((v) => !params.accent || v.accent === params.accent);
  // Same gender as the look first, then the rest; keep the list short.
  if (params.gender) voices = [...voices.filter((v) => v.gender === params.gender), ...voices.filter((v) => v.gender !== params.gender)];
  const limit = params.limit ?? 24;
  const lookDefault = params.lookVoiceId ? voices.find((v) => v.id === params.lookVoiceId) : undefined;
  const shortlist = voices.slice(0, limit);
  if (lookDefault && !shortlist.some((v) => v.id === lookDefault.id)) shortlist.unshift(lookDefault);
  const defaultId = lookDefault?.id ?? shortlist[0]?.id ?? null;
  return { languages, accents, voices: shortlist, defaultId };
}

/** One voice by id with its language, for the pre-flight check before the paid presenter call. */
export async function findVoice(voiceId: string): Promise<{ voice: Voice; language: AdLanguageCode } | null> {
  const { byLanguage } = await catalogue();
  for (const [language, voices] of byLanguage) {
    const voice = voices.find((v) => v.voice_id === voiceId);
    if (voice) return { voice, language };
  }
  return null;
}
