import Image from "next/image";
import { Star } from "lucide-react";
import { trust } from "@/content/trust";
import type { Locale } from "@/lib/i18n";
import { Marquee } from "@/components/site/Marquee";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";

/**
 * Real trust content on the homepage, from src/content/trust.ts only (24 Oct 2026). Nothing renders
 * while a list is empty: no example layout, no placeholder logos or reviews. Content arrives via
 * content-inbox/ (reviews.md, brands.md) with a permission line per item.
 */
export function HomeLogos({ locale }: { locale: Locale }) {
  if (trust.logos.length === 0) return null;
  return (
    <Reveal>
      <p className="label-mono mb-5 text-center text-muted">{locale === "nl" ? "Merken die met Clipelle werken" : "Brands working with Clipelle"}</p>
      <Marquee
        ariaLabel={locale === "nl" ? "Merken" : "Brands"}
        items={trust.logos.map((l) => {
          const logo = <Image src={l.src} alt={l.name} width={140} height={40} className="h-8 w-auto object-contain opacity-70 grayscale transition-[opacity,filter] duration-200 hover:opacity-100 hover:grayscale-0" />;
          return l.href ? <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="focus-ring rounded-control">{logo}</a> : <span key={l.name}>{logo}</span>;
        })}
      />
    </Reveal>
  );
}

export function HomeReviews({ locale }: { locale: Locale }) {
  if (trust.reviews.length === 0) return null;
  const shown = trust.reviews.slice(0, 3);
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={locale === "nl" ? "Reviews" : "Reviews"} title={locale === "nl" ? "Wat klanten zeggen" : "What customers say"} />
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {shown.map((r, i) => (
          <Reveal as="li" key={`${r.name}-${i}`} delay={i * 90} className="flex flex-col rounded-card bg-surface p-6 shadow-card">
            <div className="flex gap-0.5" aria-label={`${r.stars} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, s) => (
                <Star key={s} className={s < r.stars ? "size-4 fill-warning text-warning" : "size-4 text-border"} aria-hidden />
              ))}
            </div>
            <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink/90">“{r.text}”</p>
            <div className="mt-5 flex items-center gap-3">
              {r.avatar ? (
                <Image src={r.avatar} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-semibold text-surface" aria-hidden>{r.name.charAt(0).toUpperCase()}</span>
              )}
              <span>
                <span className="block text-sm font-semibold text-ink">{r.name}</span>
                <span className="block text-[13px] text-muted">{r.role}</span>
              </span>
            </div>
          </Reveal>
        ))}
      </ul>
    </Reveal>
  );
}
