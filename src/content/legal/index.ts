import { cookiesDoc, cookiesDocNl } from "./cookies";
import { affiliateTermsDoc, affiliateTermsDocNl } from "./affiliate-terms";
import { dataDoc, dataDocNl } from "./data";
import { termsDoc, termsDocNl } from "./terms";
import { privacyDoc, privacyDocNl } from "./privacy";
import type { LegalDoc } from "./types";
import type { Locale } from "@/lib/i18n";

/** Every legal draft in both languages. Tijs replaces the texts later in the same shape. */
export const legalDocs: Record<Locale, LegalDoc[]> = {
  en: [termsDoc, privacyDoc, cookiesDoc, affiliateTermsDoc, dataDoc],
  nl: [termsDocNl, privacyDocNl, cookiesDocNl, affiliateTermsDocNl, dataDocNl],
};
export const legalDocBySlug = (slug: string, locale: Locale = "en") => legalDocs[locale].find((d) => d.slug === slug) ?? legalDocs.en.find((d) => d.slug === slug);
export type { LegalDoc } from "./types";
