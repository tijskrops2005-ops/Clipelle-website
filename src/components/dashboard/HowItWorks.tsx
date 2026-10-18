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
      <div>
        <h2 className="text-2xl font-semibold text-ink">How it works</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          Three services, one click. You never open them yourself.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3 md:gap-6">
        <StepCard
          number={1}
          title="Product video"
          service="Vmake"
          description="Your product photos become a short, polished clip that shows the product in motion."
          panel={<ProductVideoIllustration className={illustrationClass} />}
        />
        <StepCard
          number={2}
          title="AI presenter"
          service="HeyGen"
          description="Your script is spoken by a realistic presenter, with natural voice and lip-sync."
          panel={<PresenterIllustration className={illustrationClass} />}
        />
        <StepCard
          number={3}
          title="Final video"
          service="VEED"
          description="Both clips are combined into a 9:16 ad with captions, music and a call to action."
          panel={<FinalVideoIllustration className={illustrationClass} />}
        />
      </div>
    </section>
  );
}
