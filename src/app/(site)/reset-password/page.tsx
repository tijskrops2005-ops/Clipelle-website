import type { Metadata } from "next";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ResetPasswordForm } from "@/components/site/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-10 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Password" title="Choose a new password" />
      <ResetPasswordForm />
    </div>
  );
}
