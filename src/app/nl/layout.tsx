import { SiteFrame } from "@/components/site/SiteFrame";

/** De Nederlandse marketingsite onder /nl: dezelfde pagina's, Nederlandse teksten. */
export default function DutchSiteLayout({ children }: LayoutProps<"/nl">) {
  return <SiteFrame locale="nl">{children}</SiteFrame>;
}
