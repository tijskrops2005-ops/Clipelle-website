import type { Metadata } from "next";
import { UsageSettings } from "@/components/settings/UsageSettings";

export const metadata: Metadata = { title: "Usage" };

export default function SettingsUsagePage() {
  return <UsageSettings />;
}
