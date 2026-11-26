"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { config } from "@/lib/config";
import { sendFeedback, type FeedbackKind } from "@/lib/data/settingsClient";
import { SectionCard } from "@/components/ui/SectionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

const KINDS: { key: FeedbackKind; label: string; placeholder: string }[] = [
  { key: "idea", label: "Idea", placeholder: "What would make Clipelle more useful for you?" },
  { key: "problem", label: "Problem", placeholder: "What went wrong, and on which video or page?" },
  { key: "praise", label: "Praise", placeholder: "What worked well?" },
];

/** The feedback page (26 Nov 2026, Tijs): one message to the team, read by a person. */
export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const [allowContact, setAllowContact] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = KINDS.find((k) => k.key === kind)!;

  async function submit() {
    if (message.trim().length < 10) {
      setError("Tell us a little more (at least 10 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({ kind, message: message.trim(), allowContact });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your feedback. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <SectionCard title="Thank you">
        <p className="flex items-start gap-2 text-[15px] text-ink"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />We read every message.{allowContact ? " If we have a question, we e-mail you." : ""}{config.demoMode ? " (Demo mode: nothing was sent.)" : ""}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => { setSent(false); setMessage(""); }}>Send another</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Tell us what you think" description="Ideas, problems and compliments go straight to the people who build Clipelle.">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <SegmentedControl label="Kind" options={KINDS.map((k) => ({ key: k.key, label: k.label }))} value={kind} onChange={setKind} disabled={busy} />
        <Field id="feedback-message" label="Your message" error={error ?? undefined} hint={`${message.trim().length}/2000`}>
          <Textarea id="feedback-message" value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} placeholder={current.placeholder} rows={6} maxLength={2000} disabled={busy} invalid={Boolean(error)} aria-describedby={error ? "feedback-message-error" : undefined} />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink">
          <input type="checkbox" checked={allowContact} onChange={(e) => setAllowContact(e.target.checked)} disabled={busy} className="mt-0.5 size-4 accent-ink" />
          You may e-mail me about this
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={busy || message.trim().length === 0}>{busy ? "Sending…" : "Send feedback"}</Button>
          <span className="text-[13px] text-muted">Something urgent? Use Support in the menu.</span>
        </div>
      </form>
    </SectionCard>
  );
}
