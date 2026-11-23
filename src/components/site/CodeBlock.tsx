/**
 * A code sample on the docs pages: mono, with a small language label. Server component.
 * Long lines scroll inside the box, never the page (23 Nov 2026): a block whose longest line does
 * not fit shows "scroll" in its header and fades at the right edge, so nothing looks cut off.
 */
const PHONE_CHARS = 38;
const DESKTOP_CHARS = 96;

export function CodeBlock({ code, lang = "bash", title }: { code: string; lang?: string; title?: string }) {
  const longest = code.split("\n").reduce((n, line) => Math.max(n, line.length), 0);
  const scrollsOnPhone = longest > PHONE_CHARS;
  const scrollsOnDesktop = longest > DESKTOP_CHARS;
  return (
    <figure className="relative min-w-0 max-w-full overflow-hidden rounded-card bg-ink text-surface shadow-card">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <span className="label-mono min-w-0 truncate text-white/60">{title ?? lang}</span>
        <span className="label-mono shrink-0 text-white/40">
          {scrollsOnPhone && <span className={scrollsOnDesktop ? "" : "sm:hidden"}>scroll →</span>}
          <span className={scrollsOnPhone ? (scrollsOnDesktop ? "hidden" : "hidden sm:inline") : ""}>{lang}</span>
        </span>
      </figcaption>
      <pre tabIndex={0} className="focus-ring overflow-x-auto overscroll-x-contain p-4 pr-10 text-[13px] leading-relaxed"><code>{code}</code></pre>
      {scrollsOnPhone && <span className={`pointer-events-none absolute bottom-0 right-0 top-9 w-10 bg-gradient-to-l from-ink to-transparent ${scrollsOnDesktop ? "" : "sm:hidden"}`} aria-hidden />}
    </figure>
  );
}
