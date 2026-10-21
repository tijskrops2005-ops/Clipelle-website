import { cookiesDoc } from "./cookies";
import { affiliateTermsDoc } from "./affiliate-terms";
import { dataDoc } from "./data";
import type { LegalDoc } from "./types";

export const legalDocs: LegalDoc[] = [cookiesDoc, affiliateTermsDoc, dataDoc];
export const legalDocBySlug = (slug: string) => legalDocs.find((d) => d.slug === slug);
export type { LegalDoc } from "./types";
