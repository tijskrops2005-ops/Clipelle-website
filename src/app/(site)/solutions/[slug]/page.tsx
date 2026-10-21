import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { solutionBySlug, solutions } from "@/content/solutions";
import { solutionFor } from "@/content/solutionsNl";
import { SolutionPage } from "@/components/pages/SolutionPage";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;

export function generateStaticParams() {
  return solutions.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = solutionFor(slug, locale, solutionBySlug(slug));
  return s ? pageMeta(locale, `/solutions/${slug}`, { title: `${s.eyebrow}: ${s.title}`, description: s.intro }) : { title: "Solutions" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = solutionFor(slug, locale, solutionBySlug(slug));
  if (!s) notFound();
  return <SolutionPage s={s} locale={locale} />;
}
