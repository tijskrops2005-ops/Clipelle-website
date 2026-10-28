import { resolvedExamples, resolveExampleFile } from "@/lib/examples";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { TranslatePhones } from "@/components/site/TranslatePhones";

/**
 * Before and after (28 Oct 2026): every translation sample that has its uploaded original shows
 * the two side by side, with the same phones and sound buttons as the homepage showcase. Our own
 * output only; a sample without an original is left out here and stays in the gallery.
 */
export function BeforeAfter({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const s = t.home.translate;
  const pairs = resolvedExamples("translate").flatMap((e) => {
    const original = e.original ? resolveExampleFile(e.original) : null;
    return original ? [{ e, original, originalPoster: e.originalPoster ? resolveExampleFile(e.originalPoster) ?? undefined : undefined }] : [];
  });
  if (pairs.length === 0) return null;
  return (
    <section className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-title">{t.examples.pairsTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.examples.pairsText}</p>
      </div>
      <ul className="space-y-6">
        {pairs.map(({ e, original, originalPoster }) => (
          <li key={e.id} className="stage-panel overflow-hidden rounded-card px-4 py-8 shadow-card sm:px-10 sm:py-10">
            <p className="mb-6 text-center text-[15px] font-semibold text-ink">{e.title}<span className="ml-2 font-normal text-muted">{e.note}</span></p>
            <TranslatePhones
              original={{ key: "original", label: s.original, name: `${s.original} (${e.title})`, src: original, poster: originalPoster, videoLabel: `${s.original}, ${e.title}` }}
              result={{ key: "result", label: s.result, name: `${s.result} (${e.title})`, src: e.src, poster: e.posterSrc, videoLabel: `${s.result}, ${e.title}, ${s.lipSync}` }}
              codes={e.codes ?? "→"}
              lipSync={s.lipSync}
              soundOn={s.soundOn}
              soundOff={s.soundOff}
              soundHint={s.soundHint}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
