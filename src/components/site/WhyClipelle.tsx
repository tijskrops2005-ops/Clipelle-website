import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { PLANS, currencyFor, formatMoney, translateCredits } from "@/lib/plans";
import { videoPrice } from "@/lib/pricingHelpers";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";

/**
 * "Why Clipelle" (28 Oct 2026, redesign at Tijs's request; patterns after MakeUGC's one dark feature
 * card beside an even grid and Creatify's icon-title-line cards, our own content): one bento block
 * instead of three tabs. Since 23 Nov 2026 only the price card and three facts (docs/design-clarity.md).
 * Every number is real: the price from plans.ts (a 30-second video on Pro, yearly), the rest product facts.
 */
export function WhyClipelle({ locale }: { locale: Locale }) {
  const w = dict(locale).home.why;
  const pro = PLANS.find((p) => p.key === "pro")!;
  const currency = currencyFor(locale);
  // "From" one 30-second video on Pro, billed yearly (12 Nov 2026). Real numbers from plans.ts; follows a price change.
  const perVideo = Math.round(videoPrice(pro, translateCredits({ seconds: 30, quality: "speed", enhance: false }), currency, "annual") * 100) / 100;
  const price = formatMoney(perVideo, currency, locale);

  return (
    <Reveal as="section">
      <SectionIntro title={w.title} />
      {/* 23 Nov 2026 (docs/design-clarity.md): the price and three facts. The promises list and the chips row are off (docs/removed-blocks.md). */}
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-end rounded-card bg-ink p-7 text-champagne shadow-card sm:p-9">
          <p className="text-[15px] font-medium text-champagne/70">{w.price.from}</p>
          <p className="mt-2 text-[clamp(3.2rem,7vw,5.25rem)] font-semibold leading-none tracking-[-0.045em] text-gold-light">{price}</p>
          <p className="mt-3 text-[20px] font-semibold text-champagne">{w.price.title}</p>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-champagne/70">{w.price.text}</p>
        </div>
        <ul className="grid gap-4">
          {w.stats.map((s) => (
            <li key={s.title} className="flex items-baseline gap-5 rounded-card bg-surface px-6 py-5 shadow-card">
              <span className="w-20 shrink-0 text-[34px] font-semibold leading-none tracking-[-0.035em] text-ink">{s.value}</span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold text-ink">{s.title}</span>
                <span className="block text-[14px] text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
