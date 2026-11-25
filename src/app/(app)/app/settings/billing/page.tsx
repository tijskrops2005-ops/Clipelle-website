import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingSettings } from "@/components/settings/BillingSettings";

export const metadata: Metadata = { title: "Billing" };

export default function SettingsBillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingSettings />
    </Suspense>
  );
}
