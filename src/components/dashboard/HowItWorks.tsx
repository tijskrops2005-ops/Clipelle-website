import { config } from "@/lib/config";
import { SectionHeader } from "@/components/ui/PageHeader";
import { StepCard } from "@/components/StepCard";
import {
  FinalVideoIllustration,
  PresenterIllustration,
  ProductVideoIllustration,
} from "@/components/StepIllustrations";

const illustrationClass = "mx-auto h-[72px] w-full max-w-[160px] text-ink/70";

/** Explainer: the three fixed steps every project goes through. */
export function HowItWorks() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="How it works"
        description="Three steps, one click. Everything runs on its own."
      />
      <div className="grid gap-5 md:grid-cols-3 md:gap-6">
        <StepCard
          number={1}
          title="Product clip"
          service={config.stepLabels.productClip}
          description="Your product photos become a short, polished clip that shows the product in motion."
          panel={<ProductVideoIllustration className={illustrationClass} />}
        />
        <StepCard
          number={2}
          title="AI presenter"
          service={config.stepLabels.presenter}
          description="Your script is spoken by a realistic presenter, with natural voice and lip-sync."
          panel={<PresenterIllustration className={illustrationClass} />}
        />
        <StepCard
          number={3}
          title="Final edit"
          service={config.stepLabels.finalEdit}
          description="Both clips are combined into a 9:16 ad with captions, music and a call to action."
          panel={<FinalVideoIllustration className={illustrationClass} />}
        />
      </div>
    </section>
  );
}
