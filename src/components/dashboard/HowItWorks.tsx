import { config } from "@/lib/config";
import { SectionHeader } from "@/components/ui/PageHeader";
import { StepCard } from "@/components/StepCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
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

const translateSteps: Step[] = [
  { title: "Upload", service: config.stepLabels.upload, description: "Your video is checked and stored safely, together with your rights confirmation.", Illustration: UploadIllustration },
  { title: "Translate", service: config.stepLabels.translate, description: "The speech is translated and every line is checked automatically against the original.", Illustration: TranslateIllustration },
  { title: "Captions and 9:16", service: config.stepLabels.captions, description: "Voice and lips are matched to the new language; captions and the vertical format are added.", Illustration: CaptionsIllustration },
];

/** Explainer: the fixed steps of each workflow, one row per workflow. */
export function HowItWorks() {
  return (
    <section className="space-y-8">
      <SectionHeader title="How it works" description="One click starts a fixed set of steps. Everything runs on its own; you follow progress on the project page." />
      <WorkflowRow kicker="Make an ad from a product photo" href="/new/ad" steps={adSteps} columns={4} />
      <WorkflowRow kicker="Translate an existing video" href="/new/translate" steps={translateSteps} columns={3} />
    </section>
  );
}

function WorkflowRow({ kicker, href, steps, columns }: { kicker: string; href: string; steps: Step[]; columns: 3 | 4 }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-ink">{kicker}</h3>
        <Button href={href} variant="link" size="sm">
          Start
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
      <div className={columns === 4 ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6" : "grid gap-5 sm:grid-cols-3 md:gap-6"}>
        {steps.map((s, i) => (
          <StepCard key={s.title} number={i + 1} title={s.title} service={s.service} description={s.description} className="group hover:-translate-y-0.5 hover:shadow-card-hover" panel={<s.Illustration className={illustrationClass} />} />
        ))}
      </div>
    </div>
  );
}
