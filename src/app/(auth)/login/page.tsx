import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell panel="login">
      <Suspense fallback={<div className="h-[420px] rounded-card bg-surface shadow-card" aria-hidden />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
