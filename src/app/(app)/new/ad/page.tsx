import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StepList } from "@/components/ui/StepList";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata: Metadata = { title: "New ad" };

const afterwards = [
  { title: "Script", text: "A short spoken script is written from your description." },
  { title: "Product clip", text: "Your product photo is animated into short footage." },
  { title: "AI presenter", text: "A realistic presenter speaks the script on camera." },
  { title: "Final edit", text: "One 9:16 ad with captions. Nothing else is placed on screen." },
];

export default function NewAdPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-6">
        <PageHeader
          title="New ad from a product photo"
          description="Tell us about the product once. After you click Generate, the steps run on their own and the finished ad lands on your dashboard."
        />
        <StepList items={afterwards} columns={4} />
      </div>

      <ProjectForm />
    </div>
  );
}
