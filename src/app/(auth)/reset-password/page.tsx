import type { Metadata } from "next";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/site/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell panel="login">
      <AuthCard title="Choose a new password" text="At least 8 characters. You stay signed in afterwards.">
        <ResetPasswordForm />
      </AuthCard>
    </AuthShell>
  );
}
