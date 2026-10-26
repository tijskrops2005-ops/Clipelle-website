"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { listVoices } from "@/lib/data/client";
import type { AdLanguageCode, VoiceOptions } from "@/lib/voiceOptions";
import { DemoBadge } from "@/components/DemoModeBadge";

const VISIBLE_VOICES = 6;

/**
 * Voice choice on /new/ad: filtered on language, accent and the presenter's gender; preselected
 * on the presenter's own voice when it fits the language, else the first match. Previews play one
 * at a time from the catalogue's preview URL (free). Provider names and ids never appear as text.
 */
export function VoicePicker({
  language,
  accent,
  gender,
  lookVoiceId,
  value,
  onChange,
  onOptions,
  disabled,
}: {
  language: AdLanguageCode;
  accent?: string;
  gender?: "female" | "male";
  lookVoiceId?: string;
  /** Chosen voice id, or undefined for the default. */
  value: string | undefined;
  onChange: (voiceId: string | undefined) => void;
  /** Lets the form know which languages and accents exist. */
  onOptions?: (options: VoiceOptions) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<VoiceOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        return listVoices({ language, accent, gender, lookVoiceId });
      })
      .then((res) => {
        if (cancelled) return;
        setOptions(res);
        onOptions?.(res);
        // A pick that no longer fits (other language, accent or presenter gender) falls back to the default.
        if (value && !res.voices.some((v) => v.id === value)) onChange(undefined);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on the filters only
  }, [language, accent, gender, lookVoiceId]);

  // One preview at a time; stop when unmounting.
  useEffect(() => () => audioRef.current?.pause(), []);

  function toggle(id: string, url?: string) {
    if (!url) return;
    if (playing === id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    void audio.play().catch(() => setPlaying(null));
    setPlaying(id);
  }

  const selectedId = value ?? options?.defaultId ?? null;
  // A short list first (26 Oct 2026): six voices, the chosen one always among them; the rest one click away.
  const [showAll, setShowAll] = useState(false);
  const allVoices = options?.voices ?? [];
  const firstSix = allVoices.slice(0, VISIBLE_VOICES);
  const chosen = allVoices.find((v) => v.id === selectedId);
  const shown = showAll ? allVoices : chosen && !firstSix.includes(chosen) ? [...firstSix.slice(0, VISIBLE_VOICES - 1), chosen] : firstSix;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{gender ? `Voices that match your presenter first.` : "Voices for this language."}</p>
        <DemoBadge>Demo voices</DemoBadge>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          Could not load voices: {error}
        </p>
      )}
      <ul className="divide-y divide-divider rounded-[14px] border border-border bg-surface">
        {loading && !options && (
          <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading voices…
          </li>
        )}
        {options?.voices.length === 0 && !loading && <li className="px-4 py-3 text-sm text-muted">No voices for this combination. Try another accent.</li>}
        {options && shown.map((v) => {
          const selected = v.id === selectedId;
          return (
            <li key={v.id} className={cn("flex items-center gap-3 px-3 py-2", selected && "bg-surface-muted")}>
              <button
                type="button"
                onClick={() => toggle(v.id, v.previewUrl)}
                disabled={disabled || !v.previewUrl}
                aria-label={playing === v.id ? `Pause preview of ${v.name}` : `Play preview of ${v.name}`}
                title={v.previewUrl ? "Listen" : "No preview for this voice"}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-30"
              >
                {playing === v.id ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => onChange(v.id === options.defaultId ? undefined : v.id)}
                disabled={disabled}
                aria-pressed={selected}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{v.name}</span>
                  <span className="block text-[12px] text-muted">
                    {v.gender === "female" ? "Female" : v.gender === "male" ? "Male" : "Voice"}
                    {v.accent ? ` · ${v.accent.toUpperCase()}` : ""}
                    {v.id === options.defaultId ? " · recommended for this presenter" : ""}
                  </span>
                </span>
                {selected && (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {allVoices.length > VISIBLE_VOICES && (
        <button type="button" onClick={() => setShowAll((x) => !x)} disabled={disabled} className="focus-ring rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">
          {showAll ? "Show fewer voices" : `Show all ${allVoices.length} voices`}
        </button>
      )}
    </div>
  );
}
