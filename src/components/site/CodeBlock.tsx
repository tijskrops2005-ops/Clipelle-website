/** A code sample on the docs pages: mono, scrollable, with a small language label. Server component. */
export function CodeBlock({ code, lang = "bash", title }: { code: string; lang?: string; title?: string }) {
  return (
    <figure className="overflow-hidden rounded-card bg-ink text-surface shadow-card">
      <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="label-mono text-white/60">{title ?? lang}</span>
        <span className="label-mono text-white/40">{lang}</span>
      </figcaption>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed"><code>{code}</code></pre>
    </figure>
  );
}
