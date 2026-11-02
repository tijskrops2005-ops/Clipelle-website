import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { assuranceLevel } from "@/lib/mfa";
import { adminGate } from "@/lib/mfaGate";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { MfaChallenge } from "@/components/auth/MfaChallenge";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false, follow: false } };

/** The gate in front of the admin area (2 Nov 2026): set up the authenticator, or enter its code. */
export default async function AdminMfaPage() {
  await requireAdmin({ mfa: false });
  const aal = await assuranceLevel();
  const gate = adminGate({ demo: config.demoMode, isAdmin: true, current: aal.current, next: aal.next });
  if (gate === "ok" || gate === "demo") redirect("/admin");
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader title="Two-step verification" description={gate === "setup" ? "The admin pages need two-step verification. Turn it on in your profile first; it takes a minute." : "Enter the code from your authenticator app to open the admin pages."} />
      <Card>
        <CardContent className="pt-6">
          {gate === "setup" ? (
            <Button href="/settings" variant="primary">
              <ShieldCheck className="size-4" aria-hidden />
              Turn it on in Settings → Profile
            </Button>
          ) : (
            <MfaChallenge next="/admin" compact />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
