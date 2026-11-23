"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/**
 * Copy the link, or open a share intent in a new tab. No tracking, no embeds.
 * Four equal pills in one row (23 Nov 2026): the row used to wrap two and two, with one orphan on phones.
 */
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
  const pill = "focus-ring inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-control border border-border bg-surface px-2 text-[13px] font-medium text-ink shadow-card hover:bg-surface-muted";
  return (
    <div>
      <p className="label-mono text-muted">Share</p>
      <div className="mt-2 grid max-w-sm grid-cols-4 gap-2">
        <button type="button" onClick={copy} className={pill} aria-label={copied ? "Link copied" : "Copy link"}>
          {copied ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : <Link2 className="size-4 shrink-0" aria-hidden />}
          <span className="truncate">{copied ? "Copied" : "Copy"}</span>
        </button>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" className={pill}>LinkedIn</a>
        <a href={`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener noreferrer" className={pill}>X</a>
        <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`} className={pill}>E-mail</a>
      </div>
    </div>
  );
}
