import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/site/PasswordForms";

export const metadata: Metadata = { title: "Forgot your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell panel="login">
      <AuthCard title="Forgot your password?" text="Enter your e-mail and we send a link to choose a new one.">
        <ForgotPasswordForm />
        <p className="mt-6 border-t border-divider pt-5 text-center text-[13.5px] text-muted">
          Remembered it? <Link href="/login" className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Log in</Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
