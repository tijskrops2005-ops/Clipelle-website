import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionIntro } from "@/components/site/SectionIntro";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="space-y-10 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Log in" title="Welcome back" text="With your password, or with a link we send to your e-mail." />
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
