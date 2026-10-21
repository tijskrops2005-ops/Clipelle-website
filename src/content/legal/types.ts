/** A legal page in plain sections. `draft` shows "Draft, to be reviewed"; Tijs replaces the text later in the same shape. */
export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalDoc = { slug: string; title: string; summary: string; updated: string; draft: boolean; sections: LegalSection[] };
