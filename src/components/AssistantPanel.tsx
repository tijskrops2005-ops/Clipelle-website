"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { assistantEnabled, supportChannels } from "@/lib/support";
import { OPEN_ASSISTANT_EVENT } from "@/components/SupportMenu";

type Turn = { role: "user" | "assistant"; content: string; needsHuman?: boolean };

const SUGGESTIONS = ["How do credits work?", "Which files can I upload?", "How long does a translation take?", "How do I edit a finished video?"];

/**
 * The support assistant (25 Nov 2026): opened from the Support menu, a small chat panel at the bottom
 * right (full screen on a phone). Answers come from Clipelle's own help texts; when it cannot answer,
 * the reply offers the support team (WhatsApp, e-mail, the questions and answers). The conversation
 * lives in this tab only.
 */
export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, show);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => input.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  if (!assistantEnabled() || !open) return null;
  const people = supportChannels().filter((c) => c.key !== "assistant");

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q.slice(0, 1500) }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/support/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-15).map(({ role, content }) => ({ role, content })) }) });
      const body = (await r.json().catch(() => ({}))) as { answer?: string; needsHuman?: boolean; error?: string };
      if (!r.ok || !body.answer) throw new Error(body.error ?? "The assistant could not answer right now.");
      setTurns([...next, { role: "assistant", content: body.answer, needsHuman: body.needsHuman }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant could not answer right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-label="Support assistant" className="fold-in fixed inset-0 z-[70] flex flex-col bg-surface shadow-card-hover sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:max-h-[calc(100vh-40px)] sm:w-[380px] sm:rounded-card sm:border sm:border-border">
      <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
        <span className="grid size-8 place-items-center rounded-[9px] bg-ink text-white" aria-hidden><Bot className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">Support assistant</p>
          <p className="text-[12px] text-muted">Answers from Clipelle&apos;s help pages</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close the assistant" className="focus-ring grid size-8 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"><X className="size-4" aria-hidden /></button>
      </div>

      <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <Bubble role="assistant">Hi! Ask me about translating, editing or enhancing a video, credits, file formats or an error you see.</Bubble>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="focus-ring rounded-full border border-border px-3 py-1.5 text-[12.5px] text-ink hover:bg-surface-muted">{s}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i}>
            <Bubble role={t.role}>{t.content}</Bubble>
            {t.needsHuman && (
              <div className="mt-2 space-y-1">
                <p className="text-[12.5px] text-muted">Our team can help with this:</p>
                {people.map((c) =>
                  c.external || c.href?.startsWith("mailto:") ? (
                    <a key={c.key} href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined} className="focus-ring block rounded-[10px] border border-border px-3 py-2 text-[13px] font-medium text-ink hover:bg-surface-muted">{c.label}</a>
                  ) : (
                    <Link key={c.key} href={c.href ?? "/contact"} onClick={() => setOpen(false)} className="focus-ring block rounded-[10px] border border-border px-3 py-2 text-[13px] font-medium text-ink hover:bg-surface-muted">{c.label}</Link>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <Bubble role="assistant"><span className="inline-flex gap-1" aria-label="Writing an answer"><Dot /><Dot d={150} /><Dot d={300} /></span></Bubble>}
        {error && <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger" role="alert">{error}</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void ask(draft); }} className="flex items-end gap-2 border-t border-divider p-3">
        <textarea
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(draft);
            }
          }}
          rows={1}
          maxLength={1500}
          placeholder="Ask a question"
          aria-label="Your question"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-control border border-border bg-bg px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink/30"
        />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="focus-ring grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity disabled:opacity-40"><Send className="size-4" aria-hidden /></button>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[14px] leading-relaxed", role === "user" ? "ml-auto bg-ink text-white" : "bg-surface-muted text-ink")}>{children}</div>;
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="size-1.5 animate-pulse rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />;
}
