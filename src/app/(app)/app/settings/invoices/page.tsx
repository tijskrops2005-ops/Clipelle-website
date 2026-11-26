import type { Metadata } from "next";
import { InvoicesSettings } from "@/components/settings/InvoicesSettings";

export const metadata: Metadata = { title: "Invoices" };

export default function SettingsInvoicesPage() {
  return <InvoicesSettings />;
}
