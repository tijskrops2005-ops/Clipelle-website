import {
  BookOpen,
  Briefcase,
  Building2,
  Captions,
  Clapperboard,
  Code2,
  FileText,
  Handshake,
  HelpCircle,
  Languages,
  LayoutDashboard,
  Link2,
  ListChecks,
  Mail,
  MessageSquare,
  Newspaper,
  Plug,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/** One entry in a card menu. `soon` marks what is announced but not built: the page says so too. */
export type MenuItem = { href: string; title: string; text: string; icon: LucideIcon; soon?: boolean };
export type MenuColumn = { title?: string; items: MenuItem[] };
export type MenuKey = "platform" | "solutions" | "resources" | "company";
export type Menu = { key: MenuKey; label: string; columns: MenuColumn[] };

/** The public site's menus; one source for the header, the mobile drawer, the footer and the homepage. */
export const menus: Menu[] = [
  {
    key: "platform",
    label: "Platform",
    columns: [
      {
        title: "Creation",
        items: [
          { href: "/platform/translate", title: "Translate & lipsync", text: "A video you own, in other languages, with the speaker's own voice and matching lips.", icon: Languages },
          { href: "/platform/ads", title: "Image to video", text: "One product photo becomes a finished 9:16 ad with a presenter and captions.", icon: Clapperboard },
          { href: "/platform/url-to-video", title: "URL to video", text: "Paste a product link; name, description and photos are filled in for you.", icon: Link2 },
          { href: "/new", title: "Studio", text: "The app where your videos are made and kept.", icon: LayoutDashboard },
        ],
      },
      {
        title: "Integrations",
        items: [
          { href: "/integrations/api", title: "API", text: "Create ads and translations from your own code with an API key.", icon: Code2 },
          { href: "/integrations/mcp", title: "MCP", text: "Let an AI assistant make videos through the Model Context Protocol.", icon: Workflow },
          { href: "/integrations/slack", title: "Slack bot", text: "Start a video from a Slack message. Not built yet.", icon: MessageSquare, soon: true },
          { href: "/integrations/ad-launcher", title: "Ad Launcher", text: "Send a finished ad to an ad account. Not built yet.", icon: Rocket, soon: true },
        ],
      },
    ],
  },
  {
    key: "solutions",
    label: "Solutions",
    columns: [
      {
        items: [
          { href: "/solutions/ecommerce-brands", title: "E-commerce brands", text: "A steady flow of product ads without a studio day.", icon: ShoppingBag },
          { href: "/solutions/shopify-stores", title: "Shopify stores", text: "Turn product pages into ads, one link at a time.", icon: Store },
          { href: "/solutions/dropshipping", title: "Dropshipping", text: "Test products with a video before you commit stock.", icon: Captions },
        ],
      },
      {
        items: [
          { href: "/solutions/agencies", title: "Agencies", text: "Many brands, one process, costs known before each video.", icon: Building2 },
          { href: "/solutions/apps-and-saas", title: "Apps and SaaS", text: "Explain a feature in a vertical video with a presenter.", icon: Smartphone },
          { href: "/solutions/creators-and-localization", title: "Creators and localization", text: "One video, many languages, your own voice.", icon: Users },
        ],
      },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    columns: [
      {
        title: "Learn",
        items: [
          { href: "/blog", title: "Blog", text: "Practical articles on product video, scripts, captions and translation.", icon: Newspaper },
          { href: "/resources/guides", title: "Guides", text: "Step-by-step handbooks for the things people ask about most.", icon: FileText },
          { href: "/customers", title: "Case studies", text: "Stories from brands that use Clipelle, as they share them.", icon: BookOpen },
          { href: "/resources/faq", title: "FAQ", text: "Costs, credits, rights, what is placed on screen.", icon: HelpCircle },
        ],
      },
      {
        title: "More",
        items: [
          { href: "/resources/changelog", title: "Changelog", text: "What changed, in plain words.", icon: ListChecks },
          { href: "/partners", title: "Partner program", text: "Recommend Clipelle and earn a share of subscriptions.", icon: Handshake },
          { href: "/docs/api", title: "API docs", text: "Endpoints, examples, error codes and limits.", icon: Code2 },
          { href: "/docs/mcp", title: "MCP docs", text: "Install the MCP server and connect an assistant.", icon: Plug },
        ],
      },
    ],
  },
  {
    key: "company",
    label: "Company",
    columns: [
      {
        items: [
          { href: "/about", title: "About", text: "Why Clipelle exists and how it is built.", icon: Building2 },
          { href: "/careers", title: "Careers", text: "How we work and how to get in touch.", icon: Briefcase },
          { href: "/contact", title: "Contact", text: "Questions, feedback, press.", icon: Mail },
          { href: "/press", title: "Press", text: "Brand information and press enquiries.", icon: Newspaper },
          { href: "/trust", title: "Trust", text: "Rights, data, files, costs: what we do and do not do.", icon: ShieldCheck },
        ],
      },
    ],
  },
];

export const menuByKey = (key: MenuKey) => menus.find((m) => m.key === key)!;

import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/** The same menus with the labels and texts of a language and localized links (app links stay as they are). */
export function menusFor(locale: Locale): Menu[] {
  const t = dict(locale);
  const labels: Record<MenuKey, string> = { platform: t.nav.platform.label, solutions: t.nav.solutions.label, resources: t.nav.resources.label, company: t.nav.company.label };
  const columnTitle = (key: MenuKey, title?: string) => {
    if (!title) return undefined;
    if (key === "platform") return title === "Creation" ? t.nav.platform.creation : t.nav.platform.integrations;
    if (key === "resources") return title === "Learn" ? t.nav.resources.learn : t.nav.resources.more;
    return title;
  };
  return menus.map((m) => ({
    key: m.key,
    label: labels[m.key],
    columns: m.columns.map((c) => ({
      title: columnTitle(m.key, c.title),
      items: c.items.map((i) => ({ ...i, href: siteHref(i.href, locale), title: t.nav.items[i.href]?.title ?? i.title, text: t.nav.items[i.href]?.text ?? i.text })),
    })),
  }));
}

export function footerColumnsFor(locale: Locale) {
  const t = dict(locale);
  const m = menusFor(locale);
  const items = (key: MenuKey) => m.find((x) => x.key === key)!.columns.flatMap((c) => c.items);
  const L = (p: string) => localizePath(p, locale);
  return [
    { title: t.footer.columns.platform, links: items("platform").map((i) => ({ href: i.href, label: i.soon ? `${i.title} (${t.common.soon.toLowerCase()})` : i.title })).concat([{ href: L("/pricing"), label: t.footer.links.pricing }, { href: L("/examples"), label: t.footer.links.examples }]) },
    { title: t.footer.columns.solutions, links: items("solutions").map((i) => ({ href: i.href, label: i.title })) },
    { title: t.footer.columns.resources, links: items("resources").map((i) => ({ href: i.href, label: i.title })) },
    { title: t.footer.columns.company, links: [...items("company").map((i) => ({ href: i.href, label: i.title })), { href: L("/demo"), label: t.footer.links.demo }] },
    { title: t.footer.columns.legal, links: [{ href: L("/legal/terms"), label: t.footer.links.terms }, { href: L("/legal/privacy"), label: t.footer.links.privacy }, { href: L("/legal/cookies"), label: t.footer.links.cookies }, { href: L("/legal/data"), label: t.footer.links.data }, { href: L("/legal/affiliate-terms"), label: t.footer.links.partnerTerms }] },
  ];
}
/**
 * Links from the public site into the app (Studio, tools, settings) always go through the sign-in
 * page with the destination as `next`: visitors log in or start for free first, someone already
 * signed in is sent straight on by the proxy. Site pages keep their own (localized) path.
 */
const APP_PREFIXES = ["/dashboard", "/new", "/projects", "/settings", "/batches"];
export function viaLogin(appPath: string) {
  return `/login?next=${encodeURIComponent(appPath)}`;
}
export function siteHref(href: string, locale: Locale) {
  return APP_PREFIXES.some((p) => href === p || href.startsWith(`${p}/`)) ? viaLogin(href) : localizePath(href, locale);
}

/** Flat lists kept for pages that show a menu's entries as cards. */
export const platformMenu: MenuItem[] = menuByKey("platform").columns[0].items;
export const integrationsMenu: MenuItem[] = menuByKey("platform").columns[1].items;
export const solutionsMenu: MenuItem[] = menuByKey("solutions").columns.flatMap((c) => c.items);
export const resourcesMenu: MenuItem[] = menuByKey("resources").columns.flatMap((c) => c.items);
export const companyMenu: MenuItem[] = menuByKey("company").columns.flatMap((c) => c.items);

export const footerColumns: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Platform", links: [...platformMenu, ...integrationsMenu].map((i) => ({ href: i.href, label: i.soon ? `${i.title} (soon)` : i.title })).concat([{ href: "/pricing", label: "Pricing" }, { href: "/examples", label: "Examples" }]) },
  { title: "Solutions", links: solutionsMenu.map((i) => ({ href: i.href, label: i.title })) },
  { title: "Resources", links: resourcesMenu.map((i) => ({ href: i.href, label: i.title })) },
  { title: "Company", links: [...companyMenu.map((i) => ({ href: i.href, label: i.title })), { href: "/demo", label: "Book a demo" }] },
  { title: "Legal", links: [{ href: "/legal/terms", label: "Terms of service" }, { href: "/legal/privacy", label: "Privacy" }, { href: "/legal/cookies", label: "Cookie policy" }, { href: "/legal/data", label: "Files and data" }, { href: "/legal/affiliate-terms", label: "Partner terms" }] },
];
