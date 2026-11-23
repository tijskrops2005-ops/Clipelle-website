import type { Metadata } from "next";
import { dict } from "@/content/i18n";
import { absoluteUrl } from "@/lib/site";
import { config } from "@/lib/config";
import { BlogIndex } from "@/components/site/BlogIndex";
import { JsonLd } from "@/components/site/JsonLd";

const b = dict("en").blog;

export const metadata: Metadata = {
  title: "Blog",
  description: b.metaDescription,
  alternates: { canonical: absoluteUrl("/blog"), types: { "application/rss+xml": absoluteUrl("/blog/rss.xml") } },
};

/** The blog overview; the layout lives in BlogIndex, shared with /nl/blog. */
export default function BlogPage() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Blog", name: `${config.productName} blog`, url: absoluteUrl("/blog"), description: b.metaDescription }} />
      <BlogIndex locale="en" />
    </>
  );
}
