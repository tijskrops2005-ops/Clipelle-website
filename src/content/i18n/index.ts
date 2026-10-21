import { en, type SiteDict } from "./en";
import { nl } from "./nl";
import type { Locale } from "@/lib/i18n";

export const dictionaries: Record<Locale, SiteDict> = { en, nl };
export const dict = (locale: Locale): SiteDict => dictionaries[locale] ?? en;
export type { SiteDict };
