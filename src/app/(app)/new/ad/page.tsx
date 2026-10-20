import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata: Metadata = { title: "New ad" };

const afterwards = [
  { n: 1, title: "Product clip", text: "AI animates your product photos into short footage." },
  { n: 2, title: "AI presenter", text: "A realistic presenter speaks the script on camera." },
  { n: 3, title: "Final edit", text: "Both clips become one 9:16 ad with captions. Nothing else is placed on screen." },
];

export default function NewAdPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <div className="space-y-6">
        <PageHeader
          title="New ad from a product photo"
          description="Tell us about the product once. After you click Generate, the steps run on their own and the finished ad lands on your dashboard."
        />
        <ol className="grid gap-3 sm:grid-cols-3">
          {afterwards.map((step) => (
            <li
              key={step.n}
              className="flex items-start gap-3 rounded-[14px] bg-surface-muted px-4 py-3.5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-surface">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-[13px] text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <ProjectForm />
    </div>
  );
}
