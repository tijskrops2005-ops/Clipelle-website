import { SiteFrame } from "@/components/site/SiteFrame";

/** The public marketing site in English: its own header and footer, no app shell, no sign-in needed. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteFrame locale="en">{children}</SiteFrame>;
}
