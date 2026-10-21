import type { Metadata } from "next";
import { BillingSettings } from "@/components/settings/BillingSettings";

export const metadata: Metadata = { title: "Billing" };

export default function SettingsBillingPage() {
  return <BillingSettings />;
}
