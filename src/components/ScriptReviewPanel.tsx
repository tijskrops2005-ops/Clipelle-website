"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { AdProject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { approveScript } from "@/lib/data/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { DemoBadge } from "@/components/DemoModeBadge";

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * "Review script first": shown while the script step waits for the customer. Pick one of three
 * hooks, adjust the presenter text within the hard word limit, approve. Nothing paid runs before.
 */
export function ScriptReviewPanel({ project }: { project: AdProject }) {
  const script = project.generatedScript;
  const [hookIndex, setHookIndex] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!script) return null;

  const hooks = script.hooks;
  const chosen = hooks[hookIndex] ?? hooks[0];
  // Swap the opening sentence when the customer picks another hook and has not edited the text yet.
  const generated = script.presenterScript.startsWith(hooks[0].spoken) ? chosen.spoken + script.presenterScript.slice(hooks[0].spoken.length) : script.presenterScript;
  const value = text ?? generated;
  const words = countWords(value);
  const tooLong = words > script.maxWords;
  const empty = words === 0;

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await approveScript(project.id, { hookIndex, presenterScript: text ?? undefined });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border border-warning/40">
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <p className="label-mono text-warning">Waiting for you</p>
          <CardTitle className="mt-1">Review the script</CardTitle>
          <p className="mt-1 text-[15px] text-muted">Pick the hook you like, adjust the words if you want, then approve. The presenter and product clip start after that.</p>
        </div>
        <DemoBadge>Demo script</DemoBadge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Hook (the first two seconds)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {hooks.map((h, i) => {
              const selected = i === hookIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHookIndex(i)}
                  disabled={busy}
                  aria-pressed={selected}
                  className={cn("rounded-[14px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40", selected ? "border-ink bg-surface-muted" : "border-border bg-surface hover:shadow-card")}
                >
                  <span className="block text-[15px] font-semibold leading-snug text-ink">{h.onScreen}</span>
                  <span className="mt-1.5 block text-[13px] text-muted">Spoken: “{h.spoken}”</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">What the presenter says</p>
            <p className={cn("text-[13px]", tooLong ? "font-medium text-danger" : "text-muted")}>
              {words} / {script.maxWords} words
            </p>
          </div>
          <Textarea value={value} onChange={(e) => setText(e.target.value)} disabled={busy} invalid={tooLong} className="min-h-32" maxLength={2000} />
          <p className="mt-1.5 text-[13px] text-muted">
            About 2.5 words per second; the limit keeps the voice inside the video length. The last sentence should tell the viewer what to do.
            {text !== null && (
              <button type="button" className="ml-2 underline decoration-border underline-offset-4 hover:decoration-ink" onClick={() => setText(null)} disabled={busy}>
                Reset to generated text
              </button>
            )}
          </p>
        </div>

        {script.benefits.length > 0 && (
          <div>
            <p className="label-mono mb-1.5 text-muted">Benefits on screen</p>
            <p className="text-sm text-ink/90">{script.benefits.join(" · ")}</p>
          </div>
        )}
        <div>
          <p className="label-mono mb-1.5 text-muted">End card</p>
          <p className="text-sm text-ink/90">
            {script.offer.headline} · button “{script.offer.cta}”
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted">Approving starts the paid steps.</p>
          <Button variant="accent" size="lg" onClick={approve} disabled={busy || tooLong || empty}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
            Approve and continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
