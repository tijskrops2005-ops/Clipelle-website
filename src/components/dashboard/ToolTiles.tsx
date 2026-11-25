import Link from "next/link";
import { cn } from "@/lib/utils";
import { STUDIO_TOOLS, TONE } from "@/components/tools";
import { ToolIcon } from "@/components/tools/ToolCard";

/** The four ways to start, in their category colours: the two translations, the editor, the enhancer. */
const KEYS = ["translate", "presenter", "editor", "enhance-video"];
const SHORT: Record<string, { label: string; text: string; href?: string }> = {
  translate: { label: "Translate a video", text: "Same voice, matching lips" },
  presenter: { label: "With a presenter", text: "An AI presenter speaks it" },
  editor: { label: "Video editor", text: "Trim, captions, text, logo" },
  "enhance-video": { label: "Enhance", text: "Sharper videos and photos", href: "/enhance" },
};

export function ToolTiles() {
  const tools = KEYS.map((k) => STUDIO_TOOLS.find((t) => t.key === k)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <section aria-label="Start with a tool" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tools.map((t) => {
        const s = SHORT[t.key];
        return (
          <Link key={t.key} href={s?.href ?? t.href} className={cn("focus-ring group flex flex-col items-start gap-3 rounded-tile border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-card sm:flex-row sm:items-center sm:gap-3.5 sm:p-5", TONE[t.category].ring)}>
            <ToolIcon tool={t} size="lg" />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-snug text-ink sm:truncate">{s?.label ?? t.label}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted sm:truncate">{s?.text ?? t.text}</span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}
