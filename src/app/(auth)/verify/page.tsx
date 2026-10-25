import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Verify your e-mail", robots: { index: false } };

export default function VerifyPage() {
  return (
    <AuthShell panel="signup">
      <AuthCard title="Verify your e-mail" text="Open the link we sent you. Your 30 free credits are added as soon as the address is verified.">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><Mail className="size-6" aria-hidden /></span>
        <p className="mt-5 text-[14px] leading-relaxed text-muted">Nothing arrived? Check your spam folder, or log in again to request a new link.</p>
        <Button href="/login" variant="primary" size="lg" className="mt-6 w-full">Back to log in</Button>
      </AuthCard>
    </AuthShell>
  );
}
