import type { Metadata } from "next";
import { legalDocBySlug } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";
import { absoluteUrl } from "@/lib/site";

const doc = legalDocBySlug("affiliate-terms")!;
export const metadata: Metadata = { title: doc.title, description: doc.summary, alternates: { canonical: absoluteUrl("/legal/affiliate-terms") } };

export default function Page() {
  return <LegalPage doc={doc} />;
}
