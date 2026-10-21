import { Badge } from "@/components/ui/Badge";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Reveal } from "@/components/site/Reveal";
import { resolveExampleFile } from "@/lib/examples";
import { formatDate } from "@/lib/utils";
import type { RealOutput as RealOutputData } from "@/content/realOutput";

const Missing = () => <span className="label-mono text-muted">Sample coming soon</span>;

/** One real, unedited result: the inputs, the script, the video and the measured cost and time. Missing parts say so. */
export function RealOutput({ data, kind }: { data: RealOutputData; kind: "ad" | "translation" }) {
  const video = data.videoFile ? resolveExampleFile(data.videoFile) : null;
  const photo = data.photoFile ? resolveExampleFile(data.photoFile) : null;
  const cost = data.costUsd !== undefined ? `$${data.costUsd.toFixed(2)}${data.credits ? ` · ${data.credits} credits` : ""}` : null;
  const time = data.durationSeconds !== undefined ? `${Math.round(data.durationSeconds / 60)} min` : null;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow="Real output" title={kind === "ad" ? "One real ad, exactly as it came out" : "One real translation, exactly as it came out"} text="Unedited. What went in, what came out, and what the project page showed for cost and time." />
      <div className="mt-10 grid gap-5 rounded-card bg-surface p-6 shadow-card lg:grid-cols-[1fr_auto]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="panel p-4">
            <p className="label-mono text-muted">{kind === "ad" ? "Product photo in" : "Source video"}</p>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- our own product photo from a real run
              <img src={photo} alt="Product photo used for this ad" className="mt-3 aspect-square w-full rounded-tile object-cover" />
            ) : (
              <div className="mt-3 grid aspect-square place-items-center rounded-tile border border-dashed border-border bg-surface"><Missing /></div>
            )}
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">Spoken script</p>
            {data.script ? <p className="mt-3 text-[15px] leading-relaxed text-ink">“{data.script}”</p> : <p className="mt-3"><Missing /></p>}
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">Cost as measured</p>
            <p className="mt-3 text-[22px] font-semibold text-ink">{cost ?? <Missing />}</p>
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">Time to ready</p>
            <p className="mt-3 text-[22px] font-semibold text-ink">{time ?? <Missing />}</p>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Badge tone="success">Unedited output</Badge>
            {data.settings && <span>{data.settings}</span>}
            {data.madeOn && <span>· made on {formatDate(data.madeOn)}</span>}
          </div>
        </div>
        <PhoneFrame src={video ?? undefined} float={false} className="w-[200px]" caption="Unedited output" />
      </div>
    </Reveal>
  );
}
