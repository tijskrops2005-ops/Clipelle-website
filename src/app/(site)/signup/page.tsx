import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionIntro } from "@/components/site/SectionIntro";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="space-y-10 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Sign up" title="Create your first ad free" text="One free 10-second ad once your e-mail is verified. No card needed." />
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
