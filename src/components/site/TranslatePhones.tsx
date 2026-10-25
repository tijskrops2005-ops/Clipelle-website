"use client";

import { useState } from "react";
import { ArrowRight, Sparkles, Volume2, VolumeX } from "lucide-react";
import { LazyVideo } from "@/components/site/LazyVideo";
import { cn } from "@/lib/utils";

type PhoneData = { key: "original" | "result"; label: string; name: string; src: string | null; poster?: string; videoLabel: string };

/**
 * The two phones of the translation showcase with a sound button each (25 Oct 2026). One video
 * plays with sound at a time, so the original and the translation can be heard one after the other.
 */
export function TranslatePhones({ original, result, codes, lipSync, soundOn, soundOff, soundHint }: { original: PhoneData; result: PhoneData; codes: string; lipSync: string; soundOn: string; soundOff: string; soundHint: string }) {
  const [playing, setPlaying] = useState<PhoneData["key"] | null>(null);
  const toggle = (key: PhoneData["key"]) => setPlaying((p) => (p === key ? null : key));
  return (
    <>
      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 lg:gap-10">
        <Phone data={original} tone="muted" sound={playing === "original"} onToggle={() => toggle("original")} soundOn={soundOn} soundOff={soundOff} className="justify-self-center sm:justify-self-end" />

        {/* Connector: languages, a live wave and the arrow */}
        <div className="flex flex-row items-center justify-center gap-3 sm:flex-col" aria-hidden>
          <span className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold tracking-wide text-surface shadow-card">{codes}</span>
          <span className="wave flex h-6 items-center gap-[3px] text-accent"><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /></span>
          <ArrowRight className="size-6 rotate-90 text-ink/40 sm:rotate-0" />
        </div>

        <div className="justify-self-center sm:justify-self-start">
          <Phone data={result} tone="accent" big sound={playing === "result"} onToggle={() => toggle("result")} soundOn={soundOn} soundOff={soundOff} />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink"><Sparkles className="size-4 text-accent" aria-hidden />{lipSync}</p>
        </div>
      </div>
      <p className="relative mt-6 flex items-center justify-center gap-2 text-center text-[13px] text-muted"><Volume2 className="size-4 shrink-0" aria-hidden />{soundHint}</p>
    </>
  );
}

function Phone({ data, tone, big, sound, onToggle, soundOn, soundOff, className }: { data: PhoneData; tone: "muted" | "accent"; big?: boolean; sound: boolean; onToggle: () => void; soundOn: string; soundOff: string; className?: string }) {
  const Icon = sound ? Volume2 : VolumeX;
  return (
    <figure className={className}>
      <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-ink bg-ink shadow-card-hover", big ? "w-[190px] sm:w-[230px]" : "w-[160px] sm:w-[190px]")}>
        {data.src ? <LazyVideo src={data.src} poster={data.poster} label={data.videoLabel} sound={sound} /> : <div className="grid size-full place-items-center bg-surface-muted text-[13px] text-muted">—</div>}
        <span className={cn("absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-soft", tone === "accent" ? "bg-accent text-white" : "bg-surface/90 text-ink")}>{data.label}</span>
        {data.src && (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={sound}
            aria-label={(sound ? soundOff : soundOn).replace("{name}", data.name)}
            className={cn("focus-ring absolute bottom-3 right-3 grid size-10 place-items-center rounded-full shadow-card transition-[transform,background-color] duration-200 hover:scale-105", sound ? "bg-accent text-white" : "bg-surface/90 text-ink")}
          >
            <Icon className="size-[18px]" aria-hidden />
            {sound && <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
          </button>
        )}
      </div>
    </figure>
  );
}
