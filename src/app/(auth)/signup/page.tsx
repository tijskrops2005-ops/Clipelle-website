import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell panel="signup">
      <Suspense fallback={<div className="h-[480px] rounded-card bg-surface shadow-card" aria-hidden />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
