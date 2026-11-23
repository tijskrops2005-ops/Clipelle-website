import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of a site page that is not the homepage: one h1, at most one line, the actions. No
 * eyebrow since 23 Nov 2026 (docs/design-clarity.md; the prop stays for the call sites and is
 * ignored). A hero with only text is centred; `align="left"` only when a visual or a form sits
 * beside it. On phones the actions stack at full width, so two buttons are the same size.
 */
export function PageHero({ title, text, actions, note, align = "center", className }: { eyebrow?: string; title: ReactNode; text?: ReactNode; actions?: ReactNode; note?: ReactNode; align?: "center" | "left"; className?: string }) {
  const centred = align === "center";
  return (
    <section className={cn("pt-14 sm:pt-20", centred && "text-center", className)}>
      <h1 className={cn("max-w-3xl text-balance text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]", centred && "mx-auto")}>{title}</h1>
      {text && <p className={cn("mt-5 max-w-2xl text-subtitle text-muted", centred && "mx-auto")}>{text}</p>}
      {actions && <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row sm:items-center", centred && "sm:justify-center")}>{actions}</div>}
      {note && <p className="mt-3 text-[13px] text-muted">{note}</p>}
    </section>
  );
}

/** A plain list of short facts: the quiet replacement for a row of cards (23 Nov 2026). */
export function FactList({ items, columns = 2, className }: { items: { title: ReactNode; text?: ReactNode }[]; columns?: 1 | 2; className?: string }) {
  return (
    <dl className={cn("grid gap-x-10 gap-y-6", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((it, i) => (
        <div key={i} className="border-t border-divider pt-4">
          <dt className="text-[15px] font-semibold text-ink">{it.title}</dt>
          {it.text && <dd className="mt-1 text-[15px] leading-relaxed text-muted">{it.text}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** A numbered sequence as short lines: the steps a person follows, nothing more. */
export function StepLines({ items, className }: { items: { title: ReactNode; text?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((it, i) => (
        <li key={i} className="border-t border-divider pt-4">
          <p className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-surface" aria-hidden>{i + 1}</span>
            {it.title}
          </p>
          {it.text && <p className="mt-2 text-[15px] leading-relaxed text-muted">{it.text}</p>}
        </li>
      ))}
    </ol>
  );
}

/** A section on a content page: a 24 px title and the content under it, 96 px from the next one. */
export function PageSection({ title, text, children, className, id }: { title?: ReactNode; text?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      {title && <h2 className="text-title">{title}</h2>}
      {text && <p className="mt-2 max-w-2xl text-[15px] text-muted">{text}</p>}
      <div className={cn(title || text ? "mt-8" : undefined)}>{children}</div>
    </section>
  );
}
