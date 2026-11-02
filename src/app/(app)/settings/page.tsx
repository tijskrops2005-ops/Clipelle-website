import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

export const metadata: Metadata = { title: "Settings" };

/** Profile settings; administrators also see the card that opens the customer overview (2 Nov 2026). */
export default async function SettingsProfilePage() {
  const user = await getUser();
  const admin = config.demoMode || isAdmin(user?.email);
  return (
    <>
      {admin && (
        <SectionCard title="Admin" description="Only visible to administrators.">
          <Button href="/admin/customers" variant="primary">
            <ShieldCheck className="size-4" aria-hidden />
            Open customer overview
          </Button>
        </SectionCard>
      )}
      <ProfileSettings />
    </>
  );
}
