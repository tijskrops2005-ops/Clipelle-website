import { Badge } from "@/components/ui/Badge";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Reveal } from "@/components/site/Reveal";
import { resolveExampleFile } from "@/lib/examples";
import { formatDate } from "@/lib/utils";
import type { RealOutput as RealOutputData } from "@/content/realOutput";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

const Missing = ({ label }: { label: string }) => <span className="label-mono text-muted">{label}</span>;

/** One real, unedited result: the inputs, the script, the video and the measured cost and time. Missing inputs are left out; missing numbers say so. */
export function RealOutput({ data, kind, locale = "en" }: { data: RealOutputData; kind: "ad" | "translation"; locale?: Locale }) {
  const t = dict(locale);
  const r = t.realOutput;
  const missing = <Missing label={t.common.sampleComingSoon} />;
  const video = data.videoFile ? resolveExampleFile(data.videoFile) : null;
  // A still of the same run, so the frame is never black before the video starts.
  const poster = data.videoFile ? resolveExampleFile(data.videoFile.replace(/\.mp4$/i, ".jpg")) : null;
  const photo = data.photoFile ? resolveExampleFile(data.photoFile) : null;
  const source = data.sourceVideoFile ? resolveExampleFile(data.sourceVideoFile) : null;
  const sourcePoster = data.sourceVideoFile ? resolveExampleFile(data.sourceVideoFile.replace(/\.mp4$/i, ".jpg")) : null;
  // The input panel shows only with something real in it; no "coming soon" box (25 Oct 2026).
  const hasInput = Boolean(photo || source);
  const cost = data.costUsd !== undefined ? `$${data.costUsd.toFixed(2)}${data.credits ? ` · ${data.credits} credits` : ""}` : null;
  const time = data.durationSeconds !== undefined ? `${Math.round(data.durationSeconds / 60)} min` : null;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={r.eyebrow} title={kind === "ad" ? r.titleAd : r.titleTranslation} text={r.text} />
      <div className="mt-10 grid gap-5 rounded-card bg-surface p-6 shadow-card lg:grid-cols-[1fr_auto]">
        <div className="grid gap-5 sm:grid-cols-2">
          {hasInput && (
            <div className="panel p-4">
              <p className="label-mono text-muted">{kind === "ad" ? r.photoIn : r.sourceVideo}</p>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- our own product photo from a real run
                <img src={photo} alt="Product photo used for this ad" className="mt-3 aspect-square w-full rounded-tile object-cover" />
              ) : (
                <video src={source ?? undefined} poster={sourcePoster ?? undefined} controls muted playsInline preload="none" aria-label={r.sourceVideo} className="mt-3 aspect-square w-full rounded-tile bg-ink object-cover" />
              )}
            </div>
          )}
          <div className={hasInput ? "panel p-4" : "panel p-4 sm:col-span-2"}>
            <p className="label-mono text-muted">{r.script}</p>
            {data.script ? <p className="mt-3 text-[15px] leading-relaxed text-ink">“{data.script}”</p> : <p className="mt-3">{missing}</p>}
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">{r.cost}</p>
            <p className="mt-3 text-[22px] font-semibold text-ink">{cost ?? missing}</p>
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">{r.time}</p>
            <p className="mt-3 text-[22px] font-semibold text-ink">{time ?? missing}</p>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Badge tone="success">{t.common.unedited}</Badge>
            {data.settings && <span>{data.settings}</span>}
            {data.madeOn && <span>· {r.madeOn} {formatDate(data.madeOn)}</span>}
          </div>
        </div>
        <PhoneFrame src={video ?? undefined} poster={poster ?? undefined} float={false} className="w-[200px]" caption={t.common.unedited} placeholder={t.common.sampleComingSoon} />
      </div>
    </Reveal>
  );
}
