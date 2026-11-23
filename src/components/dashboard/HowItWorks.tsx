import { config } from "@/lib/config";
import { translateFlowSteps } from "@/lib/translateFlow";
import { SectionHeader } from "@/components/ui/PageHeader";
import { StepCard } from "@/components/StepCard";
import { Button } from "@/components/ui/Button";
import {
  CaptionsIllustration,
  FinalVideoIllustration,
  PresenterIllustration,
  ProductVideoIllustration,
  ScriptIllustration,
  TranslateIllustration,
  UploadIllustration,
} from "@/components/StepIllustrations";

const illustrationClass = "mx-auto h-[64px] w-full max-w-[150px] text-ink/70 transition-[transform,color] duration-300 group-hover:scale-105 group-hover:text-accent";

type Step = { title: string; service: string; description: string; Illustration: typeof ScriptIllustration };

const adSteps: Step[] = [
  { title: "Script", service: config.stepLabels.script, description: "A short spoken script is written from your product description: hook, benefits, call to action.", Illustration: ScriptIllustration },
  { title: "Product clip", service: config.stepLabels.productClip, description: "Your product photo becomes a short, polished clip that shows the product in motion.", Illustration: ProductVideoIllustration },
  { title: "AI presenter", service: config.stepLabels.presenter, description: "A realistic presenter speaks the script on camera, with natural voice and lip-sync.", Illustration: PresenterIllustration },
  { title: "Final edit", service: config.stepLabels.finalEdit, description: "Both clips become one 9:16 ad with captions of what is said. Nothing else is placed on screen.", Illustration: FinalVideoIllustration },
];

/** The four steps of a translation come from the one list (src/lib/translateFlow.ts, 23 Nov 2026); only the mono label and the drawing are added here. */
const FLOW_EXTRAS: { service: string; Illustration: typeof ScriptIllustration }[] = [
  { service: config.stepLabels.upload, Illustration: UploadIllustration },
  { service: config.stepLabels.translate, Illustration: TranslateIllustration },
  { service: "Own voice", Illustration: PresenterIllustration },
  { service: "Your caption style", Illustration: CaptionsIllustration },
];
const translateSteps: Step[] = translateFlowSteps("en").map((s, i) => ({ title: s.title, description: s.text, ...FLOW_EXTRAS[i] }));

/** Explainer: the fixed steps of each workflow, one row per workflow. */
export function HowItWorks() {
  return (
    <section className="space-y-8">
      <SectionHeader title="How it works" />
      <WorkflowRow kicker="Translate a video" href="/new/translate" steps={translateSteps} columns={4} />
      {config.features.ads && <WorkflowRow kicker="Make an ad from a product photo" href="/new/ad" steps={adSteps} columns={4} />}
    </section>
  );
}

function WorkflowRow({ kicker, href, steps, columns }: { kicker: string; href: string; steps: Step[]; columns: 3 | 4 }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-ink">{kicker}</h3>
        <Button href={href} variant="link" size="sm">Start</Button>
      </div>
      <div className={columns === 4 ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6" : "grid gap-5 sm:grid-cols-3 md:gap-6"}>
        {steps.map((s, i) => (
          <StepCard key={s.title} number={i + 1} title={s.title} service={s.service} description={s.description} className="group hover:-translate-y-0.5 hover:shadow-card-hover" panel={<s.Illustration className={illustrationClass} />} />
        ))}
      </div>
    </div>
  );
}
