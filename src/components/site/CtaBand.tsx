import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Closing block of a marketing page: one title, one line, the main button and a quiet second one. */
export function CtaBand({ title = "Make your first ad", text = "The estimate is shown before you start. Nothing is charged until you confirm." }: { title?: string; text?: string }) {
  return (
    <section className="rounded-card bg-surface px-6 py-14 text-center shadow-card sm:py-16">
      <h2 className="text-display">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-subtitle text-muted">{text}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/signup" variant="accent" size="lg">
          Create your first ad free
          <ArrowRight className="size-5" aria-hidden />
        </Button>
        <Button href="/demo" variant="secondary" size="lg">
          Book a demo
        </Button>
      </div>
    </section>
  );
}
