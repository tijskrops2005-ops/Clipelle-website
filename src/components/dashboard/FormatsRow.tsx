import Link from "next/link";
import { FORMATS } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";
import { SectionHeader } from "@/components/ui/PageHeader";

/** Real presets: each tile opens the ad form with that format chosen. */
export function FormatsRow() {
  return (
    <section className="space-y-6">
      <SectionHeader title="Formats" description="Proven shapes for a product ad. Pick one and the script direction and tone are filled in; you can change anything." />
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {FORMATS.map((f) => (
          <Link
            key={f.key}
            href={`/new/ad?format=${f.key}`}
            className="focus-ring group relative aspect-[9/16] w-[136px] shrink-0 snap-start overflow-hidden rounded-tile bg-surface-muted shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-surface text-ink shadow-card">
              <FormatIllustration format={f.key} className="h-6 w-8 group-hover:text-accent" />
            </span>
            <div className="absolute inset-x-3 bottom-3 space-y-1">
              <p className="text-sm font-semibold leading-tight text-ink">{f.name}</p>
              <p className="text-[11px] leading-[1.3] text-muted">{f.hookStyle.split(":")[0]} hook</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
