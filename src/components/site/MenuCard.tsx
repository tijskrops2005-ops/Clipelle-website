import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MenuItem } from "./siteNav";

/** Server-rendered card for a menu item (homepage rows): the icon is rendered here, never passed to a client component. */
export function MenuCard({ card, compact }: { card: MenuItem; compact?: boolean }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} className={cn("focus-ring group flex h-full gap-3 rounded-card transition-colors duration-150 hover:bg-surface-muted", compact ? "items-start p-4" : "flex-col p-6")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          {card.title}
          {card.soon && <span className="label-mono rounded-full bg-warning/15 px-2 py-0.5 text-warning">Soon</span>}
        </span>
        <span className="mt-1 block text-[15px] leading-relaxed text-muted">{card.text}</span>
      </span>
    </Link>
  );
}
