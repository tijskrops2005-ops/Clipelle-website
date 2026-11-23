import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of a site page that is not the homepage (23 Nov 2026): mono eyebrow, one h1, one line,
 * the actions and a small note. One rule for every page: a hero with only text is centred; pass
 * `align="left"` only when a visual or a form sits beside it. On phones the actions stack at full
 * width, so two buttons are always the same size.
 */
export function PageHero({ eyebrow, title, text, actions, note, align = "center", className }: { eyebrow?: string; title: ReactNode; text?: ReactNode; actions?: ReactNode; note?: ReactNode; align?: "center" | "left"; className?: string }) {
  const centred = align === "center";
  return (
    <section className={cn("pt-16 sm:pt-24", centred && "text-center", className)}>
      {eyebrow && <p className="label-mono text-muted">{eyebrow}</p>}
      <h1 className={cn("mt-5 max-w-3xl text-balance text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]", centred && "mx-auto")}>{title}</h1>
      {text && <p className={cn("mt-6 max-w-2xl text-subtitle text-muted", centred && "mx-auto")}>{text}</p>}
      {actions && <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row sm:items-center", centred && "sm:justify-center")}>{actions}</div>}
      {note && <p className="mt-3 text-[13px] text-muted">{note}</p>}
    </section>
  );
}
