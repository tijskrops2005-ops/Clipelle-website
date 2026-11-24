import { Languages, Scissors, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * The ways to start, as one card (24 Nov 2026, Tijs: keep what you can do in the app, in the style of
 * splister.com/app's "Quick start"): the flow in one line, then the three tools. The sidebar has the
 * same tools; this card is for the first look at the dashboard.
 */
export function QuickStart() {
  return (
    <section aria-labelledby="quick-start" className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent" aria-hidden>
          <Languages className="size-5" />
        </span>
        <div>
          <h2 id="quick-start" className="text-[16px] font-semibold text-ink">Quick start</h2>
          <p className="mt-0.5 text-[14px] text-muted">Upload a video, pick the languages, start. 1 credit per second, per language.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button href="/new/translate" variant="primary">
          <Languages className="size-4" aria-hidden />
          Translate a video
        </Button>
        <Button href="/new/translate?speaker=presenter" variant="secondary">
          <UserRoundPen className="size-4" aria-hidden />
          With a presenter
        </Button>
        <Button href="/edit" variant="secondary">
          <Scissors className="size-4" aria-hidden />
          Edit a video
        </Button>
      </div>
    </section>
  );
}
