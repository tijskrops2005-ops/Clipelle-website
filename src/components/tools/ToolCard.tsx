import Link from "next/link";
import { cn } from "@/lib/utils";
import { TONE, type Tool } from "@/components/tools";

/** The icon square of a tool, in its category's colour (grey while the tool is announced). */
export function ToolIcon({ tool, size = "md" }: { tool: Tool; size?: "sm" | "md" | "lg" }) {
  const Icon = tool.icon;
  const box = size === "sm" ? "size-6 rounded-[7px]" : size === "lg" ? "size-12 rounded-[14px]" : "size-10 rounded-[12px]";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-[18px]";
  return (
    <span className={cn("grid shrink-0 place-items-center", box, tool.soon ? "bg-ink-soft text-muted" : TONE[tool.category].icon)} aria-hidden>
      <Icon className={glyph} />
    </span>
  );
}

/**
 * One tool on the All tools page (25 Nov 2026): icon in the category colour, name, one sentence, what
 * it can do as small words, and a state only when there is one ("New", "Soon"). The whole card links
 * to the tool; an announced tool links to its page with "Notify me".
 */
export function ToolCard({ tool, onNavigate }: { tool: Tool; onNavigate?: () => void }) {
  return (
    <Link
      href={tool.href}
      onClick={onNavigate}
      className={cn(
        "focus-ring group flex h-full flex-col rounded-tile border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-card",
        tool.soon ? "hover:border-ink/15" : TONE[tool.category].ring,
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <ToolIcon tool={tool} />
        {tool.soon ? <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[11.5px] font-medium text-muted">Soon</span> : tool.isNew ? <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", TONE[tool.category].icon)}>New</span> : null}
      </span>
      <span className="mt-4 block text-[15.5px] font-semibold tracking-[-0.01em] text-ink">{tool.label}</span>
      <span className="mt-1 block text-[13.5px] leading-snug text-muted">{tool.text}</span>
      {/* What it can do as one quiet line (25 Nov 2026: a row of grey pills read as generated). */}
      {tool.chips && tool.chips.length > 0 && (
        <span className="mt-auto pt-4 text-[12.5px] text-ink/55">{tool.chips.join(", ")}</span>
      )}
    </Link>
  );
}
