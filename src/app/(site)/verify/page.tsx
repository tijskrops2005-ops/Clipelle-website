import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Verify your e-mail" };

export default function VerifyPage() {
  return (
    <div className="space-y-10 pt-16 sm:pt-24">
      <SectionIntro eyebrow="One more step" title="Verify your e-mail" text="Open the link we sent you. Your free ad is unlocked as soon as the address is verified." />
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><Mail className="size-6" aria-hidden /></span>
        <p className="mt-5 text-[15px] text-muted">Nothing arrived? Check your spam folder or sign in again to request a new link.</p>
        <Button href="/login" variant="primary" className="mt-6">Back to sign in</Button>
      </div>
    </div>
  );
}
