import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StepList } from "@/components/ui/StepList";
import { TranslateForm } from "@/components/translate/TranslateForm";

export const metadata: Metadata = { title: "Translate a video" };

const afterwards = [
  { title: "Upload", text: "Your video is checked and stored safely." },
  { title: "Translate", text: "AI translates the speech and checks every line against the original." },
  { title: "Captions and 9:16", text: "Voice and lips are matched; captions and the vertical format are added." },
];

export default function NewTranslatePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-6">
        <PageHeader
          title="Translate an existing video"
          description="Upload a video you own and pick the languages. The translation is checked automatically; nothing waits for you."
        />
        <StepList items={afterwards} columns={3} />
      </div>
      <TranslateForm />
    </div>
  );
}
