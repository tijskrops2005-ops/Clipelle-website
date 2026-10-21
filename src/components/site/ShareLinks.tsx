"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Copy the link, or open a share intent in a new tab. No tracking, no embeds. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-mono text-muted">Share</span>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>{copied ? <Check className="size-4 text-success" aria-hidden /> : <Link2 className="size-4" aria-hidden />}{copied ? "Copied" : "Copy link"}</Button>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex h-9 items-center rounded-control border border-border bg-surface px-3.5 text-sm font-medium text-ink shadow-card hover:bg-surface-muted">LinkedIn</a>
      <a href={`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex h-9 items-center rounded-control border border-border bg-surface px-3.5 text-sm font-medium text-ink shadow-card hover:bg-surface-muted">X</a>
      <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`} className="focus-ring inline-flex h-9 items-center rounded-control border border-border bg-surface px-3.5 text-sm font-medium text-ink shadow-card hover:bg-surface-muted">E-mail</a>
    </div>
  );
}
