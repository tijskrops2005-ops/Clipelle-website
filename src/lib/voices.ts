import "server-only";
import { listVoices, type Voice } from "@/lib/services/heygen";
import { memoCached } from "@/lib/memoCache";
import { ACCENTS, AD_LANGUAGES, AD_LANGUAGE_CODES, accentOf, type AdLanguageCode, type VoiceOption, type VoiceOptions } from "@/lib/voiceOptions";

/**
 * Public HeyGen voices, fetched with free listing calls and cached in memory (fresh for 15
 * minutes, then served stale while a background refresh runs; see memoCache.ts).
 * Language names in the list are messy ("English", "en", "Filipino ", "", "unknown"), so they are
 * normalised here; voices without a usable language are left out.
 */

const CACHE_MS = 15 * 60 * 1000;
type Cache = { at: number; byLanguage: Map<AdLanguageCode, Voice[]> };

const NAME_TO_CODE: Record<string, AdLanguageCode> = Object.fromEntries(
  Object.entries(AD_LANGUAGES).flatMap(([code, l]) => [[l.heygenName.toLowerCase(), code as AdLanguageCode], [code, code as AdLanguageCode]]),
);

function codeOf(v: Voice): AdLanguageCode | undefined {
  const raw = (v.language ?? "").trim().toLowerCase();
  return NAME_TO_CODE[raw];
}

async function load(): Promise<Cache> {
  // One paginated listing per language we offer (free; 1–21 calls each, 100 per page), all languages at once.
  const lists = await Promise.all(
    AD_LANGUAGE_CODES.map(async (code) => {
      const items = await listVoices({ language: AD_LANGUAGES[code].heygenName, limit: 100, all: true });
      return [code, items.filter((v) => codeOf(v) === code && v.voice_id)] as const;
    }),
  );
  return { at: Date.now(), byLanguage: new Map(lists) };
}

function catalogue(): Promise<Cache> {
  return memoCached("voices", CACHE_MS, load);
}

function toOption(v: Voice, language: AdLanguageCode): VoiceOption {
  const gender = (v.gender ?? "").toLowerCase();
  // A few designed voices return a relative preview path (/v1/voice/voice_design/preview.stream…) that a
  // browser cannot play; only full https links count as a preview (checked 26 Oct 2026: 8 per language).
  const preview = v.preview_audio_url && /^https:\/\//.test(v.preview_audio_url) ? v.preview_audio_url : undefined;
  return { id: v.voice_id, name: v.name.trim(), gender: gender === "female" || gender === "male" ? gender : "other", previewUrl: preview, accent: accentOf(v.name, language) };
}

export async function listVoiceOptions(params: { language: AdLanguageCode; accent?: string; gender?: "female" | "male"; lookVoiceId?: string; limit?: number }): Promise<VoiceOptions> {
  const { byLanguage } = await catalogue();
  const languages = AD_LANGUAGE_CODES.map((code) => ({ code, label: AD_LANGUAGES[code].label, voices: byLanguage.get(code)?.length ?? 0 })).filter((l) => l.voices > 0);
  const all = (byLanguage.get(params.language) ?? []).map((v) => toOption(v, params.language));
  const accentCounts = new Map<string, number>();
  for (const v of all) if (v.accent) accentCounts.set(v.accent, (accentCounts.get(v.accent) ?? 0) + 1);
  const accents = [...accentCounts.entries()].map(([key, n]) => ({ key, label: ACCENTS[params.language].find((a) => a.key === key)?.label ?? key, voices: n }));
  let voices = all.filter((v) => !params.accent || v.accent === params.accent);
  // Voices you can listen to first, then those without a preview.
  voices = [...voices.filter((v) => v.previewUrl), ...voices.filter((v) => !v.previewUrl)];
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
