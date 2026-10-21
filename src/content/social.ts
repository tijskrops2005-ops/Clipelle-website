/**
 * Social links for the footer. Empty = no icons are shown. Add only accounts that really exist.
 * `kind` picks the icon; `href` is the public profile URL.
 */
export type SocialLink = { kind: "linkedin" | "youtube" | "instagram" | "tiktok" | "x"; href: string; label: string };

export const socialLinks: SocialLink[] = [];
