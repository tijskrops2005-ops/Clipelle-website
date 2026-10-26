"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { OptionCard, OptionGrid } from "@/components/ui/OptionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { controlClass, controlStateClass } from "@/components/ui/Field";
import { PresenterPicker } from "@/components/PresenterPicker";
import { VoicePicker } from "@/components/VoicePicker";
import { PlanHint } from "@/components/PlanHint";
import { cn } from "@/lib/utils";
import { DEFAULT_PRESENTER_ENGINE, PRESENTER_QUALITIES, type PresenterEngine } from "@/lib/pricing";
import { FEATURE_PLAN } from "@/lib/plans";
import { DEFAULT_SPEED, SPEEDS, type AdLanguageCode, type VoiceOptions } from "@/lib/voiceOptions";
import { PRESENTER_LAYOUTS, PRESENTER_LAYOUT_META, type PresenterTranslate } from "@/lib/presenterTranslate";
import type { Presenter } from "@/lib/types";

export const DEFAULT_PRESENTER_TRANSLATE: PresenterTranslate = { engine: DEFAULT_PRESENTER_ENGINE, layout: "presenter", speed: DEFAULT_SPEED };

/**
 * The AI presenter choices of a translation (26 Oct 2026): quality, the presenter, the accent and
 * voice for the target language, speaking speed and the layout. The same pickers as the ad form.
 */
export function PresenterSetup({ value, onChange, language, creditsFor, canPremium, disabled }: { value: PresenterTranslate; onChange: (next: PresenterTranslate) => void; language: AdLanguageCode; creditsFor: (engine: PresenterEngine) => number; canPremium: boolean; disabled?: boolean }) {
  const [presenter, setPresenter] = useState<Presenter | undefined>();
  const [voiceOptions, setVoiceOptions] = useState<VoiceOptions | null>(null);
  const set = (patch: Partial<PresenterTranslate>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Presenter quality</legend>
        <OptionGrid columns={2}>
          {PRESENTER_QUALITIES.map((q) => (
            <OptionCard
              key={q.key}
              selected={value.engine === q.key}
              onSelect={() => set({ engine: q.key })}
              disabled={disabled}
              lockedTo={q.key === "avatar_iv" && !canPremium ? FEATURE_PLAN.premium : undefined}
              title={q.label}
              badge={q.key === DEFAULT_PRESENTER_ENGINE ? <Badge tone="success">Recommended</Badge> : undefined}
              meta={<span className="label-mono text-muted">{creditsFor(q.key)} credits</span>}
              description={q.blurb}
            />
          ))}
        </OptionGrid>
        {!canPremium && <PlanHint feature="premium" text="The Premium presenter comes with Pro and up." />}
      </fieldset>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Presenter</p>
        <PresenterPicker
          engine={value.engine}
          value={value.lookId}
          onChange={(id, p) => {
            set({ lookId: id, voiceId: undefined });
            if (p) setPresenter(p);
          }}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Accent</span>
          <select
            value={value.accent ?? ""}
            onChange={(e) => set({ accent: e.target.value || undefined, voiceId: undefined })}
            disabled={disabled || !voiceOptions || voiceOptions.accents.length === 0}
            className={cn(controlClass, controlStateClass(false), "h-11")}
          >
            <option value="">Any</option>
            {voiceOptions?.accents.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
          <span className="mt-1.5 block text-[13px] text-muted">{voiceOptions && voiceOptions.accents.length === 0 ? "No regional variants for this language yet." : "Only accents that have voices are listed."}</span>
        </label>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Speaking speed</legend>
          <SegmentedControl label="Speaking speed" size="sm" options={SPEEDS.map((s) => ({ key: s.key, label: s.label }))} value={value.speed ?? DEFAULT_SPEED} onChange={(k) => set({ speed: k })} disabled={disabled} />
        </fieldset>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Voice</p>
        <VoicePicker
          language={language}
          accent={value.accent}
          gender={presenter?.gender === "female" || presenter?.gender === "male" ? presenter.gender : undefined}
          lookVoiceId={presenter?.defaultVoiceId}
          value={value.voiceId}
          onChange={(voiceId) => set({ voiceId })}
          onOptions={setVoiceOptions}
          disabled={disabled}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Layout</legend>
        <OptionGrid columns={2}>
          {PRESENTER_LAYOUTS.map((l) => (
            <OptionCard key={l} selected={value.layout === l} onSelect={() => set({ layout: l })} disabled={disabled} title={PRESENTER_LAYOUT_META[l].title} description={PRESENTER_LAYOUT_META[l].text} />
          ))}
        </OptionGrid>
      </fieldset>
    </div>
  );
}
