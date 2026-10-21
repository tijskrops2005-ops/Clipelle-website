import type { Metadata } from "next";
import { ConnectionsSettings } from "@/components/settings/ConnectionsSettings";

export const metadata: Metadata = { title: "Connections" };

export default function SettingsConnectionsPage() {
  return <ConnectionsSettings />;
}
