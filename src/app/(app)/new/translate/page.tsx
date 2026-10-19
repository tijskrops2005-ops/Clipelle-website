import type { Metadata } from "next";
import { config } from "@/lib/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { TranslateForm } from "@/components/translate/TranslateForm";

export const metadata: Metadata = { title: "Translate a video" };

const afterwards = [
  { n: 1, title: "Translate", text: `${config.services.translate} translates speech, voice and lip movements.` },
  { n: 2, title: "Review", text: "You check every line next to the original and approve." },
  { n: 3, title: "Captions and 9:16", text: `${config.services.captions} adds captions and the vertical format.` },
];

export default function NewTranslatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <div className="space-y-6">
        <PageHeader
          title="Translate an existing video"
          description="Upload a video you own and pick the languages. You review the translation before anything is rendered."
        />
        <ol className="grid gap-3 sm:grid-cols-3">
          {afterwards.map((step) => (
            <li key={step.n} className="flex items-start gap-3 rounded-[14px] bg-surface-muted px-4 py-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-surface">{step.n}</span>
              <div>
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-[13px] text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <TranslateForm />
    </div>
  );
}
