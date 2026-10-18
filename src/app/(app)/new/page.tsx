import type { Metadata } from "next";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata: Metadata = { title: "New video" };

const afterwards = [
  { n: 1, title: "Product clip", text: "Vmake animates your product photos." },
  { n: 2, title: "AI presenter", text: "HeyGen speaks the script on camera." },
  { n: 3, title: "Final ad", text: "VEED combines both into a 9:16 video." },
];

export default function NewVideoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header className="space-y-4">
        <h1 className="text-display text-ink">New video</h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">
          Tell us about the product once. After you click Generate, three steps
          run on their own and the finished ad lands on your dashboard.
        </p>
        <ol className="grid gap-3 pt-2 sm:grid-cols-3">
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
      </header>

      <ProjectForm />
    </div>
  );
}
