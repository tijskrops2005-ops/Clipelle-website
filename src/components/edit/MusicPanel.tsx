"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music2, Pause, Play, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { stageMusic } from "@/lib/data/client";
import { MUSIC_DEFAULT_VOLUME, MUSIC_MAX_VOLUME, type EditRecipe, type RecipeMusic } from "@/lib/editRecipe";
import { MUSIC_LIBRARY } from "@/content/musicLibrary";
import { formatDuration } from "@/components/ui/VideoDropzone";

const ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,.mp3,.m4a,.aac,.wav";

/**
 * Background music on the edit screen (26 Nov 2026, Tijs): one of our own tracks (no licence
 * question, fine in paid ads too) or the customer's own file, with a volume under the voice. The
 * preview plays it with the video; the export mixes it in, repeated when the track is shorter.
 */
export function MusicPanel({ recipe, onRecipe, disabled, onLocalFile }: { recipe: EditRecipe; onRecipe: (next: EditRecipe) => void; disabled?: boolean; /** A picked file plays in the preview from the browser. */ onLocalFile: (url: string | null) => void }) {
  const music: RecipeMusic = recipe.music ?? { enabled: false, source: "library", volume: MUSIC_DEFAULT_VOLUME };
  const set = (patch: Partial<RecipeMusic>) => onRecipe({ ...recipe, music: { ...music, ...patch } });
  const [listening, setListening] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => audio.current?.pause(), []);

  function listen(file: string, key: string) {
    if (listening === key) {
      audio.current?.pause();
      setListening(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(file);
    a.volume = 0.6;
    a.onended = () => setListening(null);
    audio.current = a;
    void a.play().catch(() => setListening(null));
    setListening(key);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 20 * 1024 * 1024) {
      setError(`This file is ${(file.size / 1e6).toFixed(1)} MB; the limit is 20 MB.`);
      return;
    }
    onLocalFile(URL.createObjectURL(file));
    if (config.demoMode) {
      set({ enabled: true, source: "upload", path: `demo/${file.name}`, name: file.name });
      return;
    }
    try {
      setUploading(0);
      const staged = await stageMusic(file, (f) => setUploading(Math.round(f * 100)));
      if (staged) set({ enabled: true, source: "upload", path: staged.path, name: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be uploaded. Try again.");
      onLocalFile(null);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={music.enabled} onChange={(e) => set({ enabled: e.target.checked, ...(e.target.checked && !music.track && !music.path ? { source: "library" as const, track: MUSIC_LIBRARY[0].key } : {}) })} disabled={disabled} className="size-4 accent-ink" />
          Background music
        </label>
        {music.enabled && (
          <label className="flex min-w-[220px] flex-1 items-center gap-3 text-[13px] text-muted sm:max-w-[320px]">
            Volume
            <input type="range" min={0.04} max={MUSIC_MAX_VOLUME} step={0.02} value={music.volume} onChange={(e) => set({ volume: Number(e.target.value) })} disabled={disabled} className="w-full accent-ink" aria-label="Music volume" />
            <span className="w-9 text-right tabular-nums text-ink">{Math.round((music.volume / MUSIC_MAX_VOLUME) * 100)}%</span>
          </label>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Music track">
        {MUSIC_LIBRARY.map((t) => {
          const chosen = music.enabled && music.source === "library" && music.track === t.key;
          return (
            <li key={t.key} className={cn("flex items-center gap-3 rounded-[12px] border p-2.5 transition-colors", chosen ? "border-ink bg-ink/[0.03]" : "border-border")}>
              <button type="button" onClick={() => listen(t.file, t.key)} aria-label={listening === t.key ? `Stop ${t.title}` : `Listen to ${t.title}`} className="focus-ring grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink hover:bg-ink/10">
                {listening === t.key ? <Pause className="size-4" aria-hidden /> : <Play className="ml-0.5 size-4" aria-hidden />}
              </button>
              <button type="button" role="radio" aria-checked={chosen} onClick={() => set({ enabled: true, source: "library", track: t.key })} disabled={disabled} className="focus-ring min-w-0 flex-1 rounded-control text-left">
                <span className="block truncate text-[14px] font-medium text-ink">{t.title}</span>
                <span className="block text-[12.5px] text-muted">{t.mood} · {formatDuration(t.seconds)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} tabIndex={-1} aria-hidden />
        <button type="button" onClick={() => input.current?.click()} disabled={disabled || uploading !== null} className="focus-ring inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-ink/40 disabled:opacity-60">
          {uploading !== null ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {uploading !== null ? `Uploading ${uploading}%` : "Use your own music"}
        </button>
        {music.enabled && music.source === "upload" && music.name && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pl-3 pr-1 text-[13px] text-ink">
            <Music2 className="size-3.5 text-muted" aria-hidden />
            <span className="max-w-[200px] truncate">{music.name}</span>
            <button type="button" onClick={() => { set({ source: "library", track: MUSIC_LIBRARY[0].key, path: undefined, name: undefined }); onLocalFile(null); }} aria-label="Remove your music" className="focus-ring grid size-6 place-items-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"><X className="size-3.5" aria-hidden /></button>
          </span>
        )}
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <p className="text-[12.5px] text-muted">Our tracks are made for Clipelle and free to use in any video, also in ads. Use your own music only when you may use it.</p>
    </div>
  );
}
