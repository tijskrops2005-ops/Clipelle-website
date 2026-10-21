/**
 * Customer stories (/customers). ONE rule: only real customers, with their permission, imported from
 * content-inbox/ exactly as supplied (formatting only, no added words). While this list is empty the
 * page shows "Stories coming soon" and nothing invented. Leave a field empty when it was not supplied
 * (e.g. no logo or no permission yet) and report it.
 */
export type CaseStudy = {
  slug: string;
  company: string;
  /** Path under /public, e.g. "/customers/acme.svg". Empty when not supplied. */
  logo?: string;
  industry?: string;
  title: string;
  summary: string;
  /** Sections exactly as supplied: heading + paragraphs. */
  sections: { heading: string; paragraphs: string[] }[];
  /** A quote exactly as supplied, with the person's name and role when they allowed it. */
  quote?: { text: string; name?: string; role?: string };
  /** A video the customer allowed us to show (own storage or public URL). */
  videoUrl?: string;
  /** Permission on file: who gave it and when. Required before a story is shown. */
  permission?: { by: string; date: string };
};

export const caseStudies: CaseStudy[] = [];

export const caseStudyBySlug = (slug: string) => caseStudies.find((c) => c.slug === slug);
/** Only stories with permission are ever rendered. */
export const publishedCaseStudies = () => caseStudies.filter((c) => c.permission);
