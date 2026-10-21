import { Captions, Clapperboard, FileText, HelpCircle, Languages, ListChecks, type LucideIcon } from "lucide-react";

export type MenuCard = { href: string; title: string; text: string; icon: LucideIcon };

/** The public site's menus; one source for the header, the mobile drawer and the footer. */
export const platformMenu: MenuCard[] = [
  { href: "/platform/ads", title: "Create ads", text: "From one product photo to a finished 9:16 ad with a presenter and captions.", icon: Clapperboard },
  { href: "/platform/translate", title: "Translate videos", text: "A video you own, in other languages, with the speaker's own voice and matching lips.", icon: Languages },
  { href: "/examples", title: "Examples", text: "Finished videos made with Reelay, nothing else.", icon: Captions },
];

export const resourcesMenu: MenuCard[] = [
  { href: "/resources/guides", title: "Guides", text: "Short reads on descriptions, presenter quality and translating.", icon: FileText },
  { href: "/resources/faq", title: "FAQ", text: "Costs, credits, rights, what is placed on screen.", icon: HelpCircle },
  { href: "/resources/changelog", title: "Changelog", text: "What changed, in plain words.", icon: ListChecks },
];

export const footerColumns: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Platform", links: [{ href: "/platform/ads", label: "Create ads" }, { href: "/platform/translate", label: "Translate videos" }, { href: "/examples", label: "Examples" }, { href: "/pricing", label: "Pricing" }] },
  { title: "Resources", links: [{ href: "/resources/guides", label: "Guides" }, { href: "/resources/faq", label: "FAQ" }, { href: "/resources/changelog", label: "Changelog" }] },
  { title: "Company", links: [{ href: "/about", label: "About" }, { href: "/demo", label: "Book a demo" }, { href: "/contact", label: "Contact" }] },
  { title: "Legal", links: [{ href: "/legal/terms", label: "Terms of service" }, { href: "/legal/privacy", label: "Privacy" }] },
];
