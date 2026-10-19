import { ACCENTS, AD_LANGUAGES, AD_LANGUAGE_CODES, type AdLanguageCode, type VoiceOptions } from "@/lib/voiceOptions";

/** Demo-mode voices: placeholders per language, no previews, no provider calls. */
const DEMO_NAMES: Record<"female" | "male", string[]> = {
  female: ["Nora - Warm & Clear", "Elin - Bright & Friendly", "Sofia - Calm & Confident"],
  male: ["Daan - Clear & Professional", "Milan - Warm & Easygoing"],
};

export function mockVoiceOptions(params: { language: AdLanguageCode; accent?: string; gender?: "female" | "male"; lookVoiceId?: string }): VoiceOptions {
  const languages = AD_LANGUAGE_CODES.map((code) => ({ code, label: AD_LANGUAGES[code].label, voices: 5 }));
  const accents = params.language === "en" ? ACCENTS.en.slice(0, 2).map((a) => ({ key: a.key, label: a.label, voices: 2 })) : [];
  const all = (["female", "male"] as const).flatMap((gender) =>
    DEMO_NAMES[gender].map((name, i) => ({ id: `demo-${params.language}-${gender}-${i}`, name, gender, accent: params.language === "en" ? (i % 2 ? "uk" : "us") : undefined })),
  );
  let voices = all.filter((v) => !params.accent || v.accent === params.accent);
  if (params.gender) voices = [...voices.filter((v) => v.gender === params.gender), ...voices.filter((v) => v.gender !== params.gender)];
  const lookDefault = voices.find((v) => v.id === params.lookVoiceId);
  return { languages, accents, voices, defaultId: lookDefault?.id ?? voices[0]?.id ?? null };
}
