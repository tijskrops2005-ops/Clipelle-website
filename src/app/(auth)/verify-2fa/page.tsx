import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { MfaChallenge } from "@/components/auth/MfaChallenge";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false } };

/** The second sign-in step for accounts with an authenticator (2 Nov 2026); the proxy sends them here. The `?next=` is read in the browser (Suspense), so the page stays static. */
export default function VerifyTwoFactorPage() {
  return (
    <AuthShell panel="login">
      <AuthCard title="One more step" text="Enter the code from your authenticator app to finish signing in.">
        <Suspense fallback={<div className="h-40" aria-hidden />}>
          <MfaChallenge />
        </Suspense>
      </AuthCard>
    </AuthShell>
  );
}
