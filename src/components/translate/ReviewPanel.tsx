"use client";

import { useState } from "react";
import { Check, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import type { LanguageCode, Segment, Translation } from "@/lib/types";
import { languageOf } from "@/lib/languages";
import { maxCharsForSegment } from "@/lib/translatePricing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { DemoBadge } from "@/components/DemoModeBadge";

/** 12.3 s → "0:12.3" */
export function formatTimecode(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

type ReviewPanelProps = {
  translations: Translation[];
  sourceLanguage: LanguageCode;
  /** Called on every edit so the parent (store or server) keeps the latest text. */
  onChange: (language: LanguageCode, segments: Segment[]) => void;
  /** Returns the rewritten fragments for one language (simulated in demo mode, Claude later). */
  onRewrite: (language: LanguageCode, segments: Segment[]) => Promise<Segment[]>;
  /** Final approval; disabled while a fragment is over its limit or empty. */
  onApprove: () => void;
  approveLabel?: string;
  approving?: boolean;
  /** Extra line under the approve button, e.g. a cost estimate on the dev page. */
  approveNote?: string;
  demo?: boolean;
};

/**
 * The correction screen: one tab per target language, every fragment with its
 * timing, the original text next to the translation, a per-fragment character
 * limit, "Rewrite in ad tone" and a final approval button.
 */
export function ReviewPanel({
  translations,
  sourceLanguage,
  onChange,
  onRewrite,
  onApprove,
  approveLabel = "Create videos",
  approving,
  approveNote,
  demo,
}: ReviewPanelProps) {
  const [active, setActive] = useState<LanguageCode>(translations[0]?.language ?? "en");
  const [rewriting, setRewriting] = useState<LanguageCode | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const current = translations.find((t) => t.language === active) ?? translations[0];

  if (!current) return null;

  const problems = translations.flatMap((t) =>
    t.segments
      .filter((s) => !s.text.trim() || s.text.length > maxCharsForSegment(s.start, s.end))
      .map((s) => ({ language: t.language, index: s.index })),
  );

  function updateSegment(index: number, text: string) {
    onChange(current.language, current.segments.map((s) => (s.index === index ? { ...s, text } : s)));
  }

  function resetSegment(index: number) {
    const segment = current.segments.find((s) => s.index === index);
    if (segment) updateSegment(index, segment.translated);
  }

  async function rewrite() {
    setRewriting(current.language);
    setRewriteError(null);
    try {
      const next = await onRewrite(current.language, current.segments);
      onChange(current.language, next);
    } catch (error) {
      setRewriteError(error instanceof Error ? error.message : "The rewrite did not work. Try again.");
    } finally {
      setRewriting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Review the translation</CardTitle>
          <p className="mt-1 text-[15px] text-muted">
            Original on the left, translation on the right. Keep each fragment inside its limit so the new voice fits the timing.
          </p>
        </div>
        {demo && <DemoBadge>Demo translation</DemoBadge>}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Language tabs */}
        <div role="tablist" aria-label="Target language" className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1">
          {translations.map((t) => {
            const isActive = t.language === current.language;
            const count = problems.filter((p) => p.language === t.language).length;
            return (
              <button
                key={t.language}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActive(t.language)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted",
                  isActive ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
                )}
              >
                {languageOf(t.language).label}
                {count > 0 ? (
                  <span className="label-mono rounded-full bg-danger/12 px-1.5 py-0.5 text-ink">{count}</span>
                ) : (
                  <Check className="size-3.5 text-success" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-[14px] bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {current.segments.length} fragments · {languageOf(sourceLanguage).label} → {languageOf(current.language).label}
          </p>
          <Button size="sm" variant="secondary" onClick={rewrite} disabled={rewriting !== null || approving}>
            {rewriting === current.language ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Rewrite in ad tone
          </Button>
        </div>
        {rewriteError && (
          <p role="alert" className="text-sm text-danger">
            {rewriteError}
          </p>
        )}

        {/* Fragments */}
        <ol className="space-y-4">
          {current.segments.map((segment) => {
            const max = maxCharsForSegment(segment.start, segment.end);
            const over = segment.text.length > max;
            const empty = !segment.text.trim();
            const id = `seg-${current.language}-${segment.index}`;
            return (
              <li key={segment.index} className="grid gap-3 rounded-[14px] border border-border p-4 md:grid-cols-[auto_1fr_1fr] md:gap-5">
                <div className="flex items-start gap-3 md:w-24 md:flex-col md:gap-1">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-surface">
                    {segment.index}
                  </span>
                  <span className="label-mono pt-1.5 text-muted md:pt-0">
                    {formatTimecode(segment.start)} → {formatTimecode(segment.end)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="label-mono mb-1.5 text-muted">Original · {languageOf(sourceLanguage).tag}</p>
                  <p className="text-sm leading-relaxed text-ink/80">{segment.original}</p>
                </div>

                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor={id} className="label-mono text-muted">
                      Translation · {languageOf(current.language).tag}
                    </label>
                    <span className={cn("label-mono", over || empty ? "text-danger" : "text-muted")}>
                      {segment.text.length}/{max}
                    </span>
                  </div>
                  <Textarea
                    id={id}
                    value={segment.text}
                    onChange={(e) => updateSegment(segment.index, e.target.value)}
                    invalid={over || empty}
                    disabled={approving}
                    className="min-h-20 text-sm"
                    aria-describedby={over ? `${id}-limit` : undefined}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    {over ? (
                      <p id={`${id}-limit`} className="text-[13px] text-danger">
                        Too long for {(segment.end - segment.start).toFixed(1)} s of speech. Shorten it.
                      </p>
                    ) : empty ? (
                      <p className="text-[13px] text-danger">A fragment cannot be empty.</p>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => resetSegment(segment.index)}
                      disabled={approving || segment.translated === segment.text}
                      className="inline-flex items-center gap-1 rounded-control text-[13px] text-muted hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                    >
                      <RotateCcw className="size-3" aria-hidden />
                      Reset
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Approve */}
        <div className="flex flex-col gap-3 border-t border-divider pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            {problems.length > 0
              ? `${problems.length} fragment${problems.length === 1 ? "" : "s"} still need${problems.length === 1 ? "s" : ""} attention.`
              : approveNote ?? "Everything fits. Approving starts the render for every language."}
          </p>
          <Button variant="accent" size="lg" onClick={onApprove} disabled={problems.length > 0 || approving}>
            {approving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
            {approving ? "Starting…" : approveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
