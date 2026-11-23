import { resolvedExamples, resolveExampleFile } from "@/lib/examples";
import { exampleWords } from "@/content/examples";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { TranslatePhones } from "@/components/site/TranslatePhones";

/**
 * Before and after (28 Oct 2026): every translation sample, the uploaded original next to the result
 * where we have it, with the same phones and sound buttons as the homepage showcase. Our own output only.
 */
export function BeforeAfter({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const s = t.home.translate;
  // Since 23 Nov 2026 every translation sample is here: with its original where we have it, alone otherwise
  // (the separate grid with the browser's own players repeated the same videos; docs/removed-blocks.md).
  const samples = resolvedExamples("translate").map((e) => ({
    e,
    words: exampleWords(e, locale),
    original: e.original ? resolveExampleFile(e.original) : null,
    originalPoster: e.originalPoster ? resolveExampleFile(e.originalPoster) ?? undefined : undefined,
  }));
  if (samples.length === 0) return null;
  return (
    <section aria-label={t.examples.pairsTitle}>
      <ul className="space-y-6">
        {samples.map(({ e, words, original, originalPoster }) => (
          <li key={e.id} className="stage-panel overflow-hidden rounded-card px-4 py-8 shadow-card sm:px-10 sm:py-10">
            <p className="mb-6 text-center text-[15px] font-semibold text-ink">{words.title}<span className="mt-1 block font-normal text-muted sm:ml-2 sm:mt-0 sm:inline">{words.note}</span></p>
            <TranslatePhones
              syncId={`pair-${e.id}`}
              original={original ? { key: "original", label: s.original, name: `${s.original} (${words.title})`, src: original, poster: originalPoster, videoLabel: `${s.original}, ${words.title}`, pace: e.originalPace } : null}
              result={{ key: "result", label: s.result, name: `${s.result} (${words.title})`, src: e.src, poster: e.posterSrc, videoLabel: `${s.result}, ${words.title}, ${s.lipSync}` }}
              codes={e.codes ?? "→"}
              lipSync={s.lipSync}
              soundOn={s.soundOn}
              soundOff={s.soundOff}
              soundHint=""
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
