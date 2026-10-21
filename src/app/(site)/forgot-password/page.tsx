import type { Metadata } from "next";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ForgotPasswordForm } from "@/components/site/PasswordForms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-10 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Password" title="Forgot your password?" text="Enter your e-mail and we send a link to choose a new one." />
      <ForgotPasswordForm />
    </div>
  );
}
