import type { Locale } from "@/lib/i18n";
import { dict } from "@/content/i18n";
import { config } from "@/lib/config";
import { measured } from "@/content/measured";
import { TRANSLATE_LANGUAGES } from "@/lib/translateLanguages";
import { cachedPublicStats, publicStatsMin, statColumns } from "@/lib/publicStats";
import { Reveal } from "@/components/site/Reveal";
import { CountUp } from "@/components/motion/CountUp";

/**
 * Three columns of live numbers from our own database (src/lib/publicStats.ts, refreshed hourly).
 * A number below PUBLIC_STATS_MIN is replaced by a product fact; with no real number at all the
 * row is not shown (26 Oct 2026), because the facts repeated the blocks around it.
 */
export async function LiveStats({ locale }: { locale: Locale }) {
  const s = dict(locale).home.liveStats;
  const columns = statColumns(await cachedPublicStats(), publicStatsMin(), { measuredAdMinutes: config.features.ads ? measured.adMinutes : null, languageCount: TRANSLATE_LANGUAGES.length });
  const anyLive = columns.some((c) => c.kind === "number");
  // 26 Oct 2026: without a real number the facts only repeated the blocks around it, so the row waits for real numbers.
  if (!anyLive) return null;
  return (
    <Reveal as="section" aria-label={s.label}>
      <dl className="grid overflow-hidden rounded-card bg-surface shadow-card sm:grid-cols-3">
        {columns.map((c, i) => {
          const fact = c.kind === "fact" ? s.facts[c.key] : null;
          return (
            <div key={c.key + i} className="flex min-h-36 flex-col items-center justify-center border-divider px-6 py-8 text-center max-sm:[&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-l">
              {/* label first in the markup (dt before dd), number first on screen */}
              <dt className="order-2 mt-3 max-w-60 text-[14.5px] text-muted">{c.kind === "number" ? s.numbers[c.key] : fact!.small}</dt>
              <dd className="order-1 text-[clamp(2.2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.035em] text-ink">
                {c.kind === "number" ? <CountUp value={c.value} /> : fact!.big.replace("{n}", String(c.n ?? ""))}
              </dd>
            </div>
          );
        })}
      </dl>
      {anyLive && <p className="mt-3 text-center text-[12.5px] text-muted">{s.footnote}</p>}
    </Reveal>
  );
}
