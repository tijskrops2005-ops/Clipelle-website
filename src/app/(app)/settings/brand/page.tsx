import type { Metadata } from "next";
import { BrandSettings } from "@/components/settings/BrandSettings";

export const metadata: Metadata = { title: "Brand" };

export default function SettingsBrandPage() {
  return <BrandSettings />;
}
