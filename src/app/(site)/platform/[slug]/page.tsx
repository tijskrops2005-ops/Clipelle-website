import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolLandingPage } from "@/components/pages/ToolLandingPage";
import { toolPageBySlug, toolPages } from "@/content/toolPages";
import { pageMeta } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

/** The tool pages are known at build time: one static page each. */
export function generateStaticParams() {
  return toolPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = toolPageBySlug((await params).slug);
  return page ? pageMeta("en", `/platform/${page.slug}`, { title: page.metaTitle, description: page.metaDescription }) : {};
}

export default async function Page({ params }: Props) {
  const page = toolPageBySlug((await params).slug);
  if (!page) notFound();
  return <ToolLandingPage page={page} />;
}
