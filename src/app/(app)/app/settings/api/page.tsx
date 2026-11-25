import type { Metadata } from "next";
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";
import { WebhooksSettings } from "@/components/settings/WebhooksSettings";

export const metadata: Metadata = { title: "API keys" };

export default function SettingsApiPage() {
  return (
    <>
      <ApiKeysSettings />
      <WebhooksSettings />
    </>
  );
}
