/**
 * The one source for the brand (22 October 2026). Every visible text, e-mail and piece of
 * metadata reads the name, tagline and addresses from here; nothing else hard-codes a name, a
 * domain or an e-mail address. The public domain is not fixed yet: links that need it come from
 * NEXT_PUBLIC_SITE_URL and e-mail addresses from the variables below, and anything that would
 * need a missing address stays hidden instead of showing a made-up one. Browser-safe.
 */
export const brand = {
  name: "Clipelle",
  /** One line for metadata and the sidebar footer. */
  tagline: "Your videos in every language, automatically.",
  /** Two sentences for descriptions and the organisation schema. */
  description: "Clipelle translates videos you own into other languages with the speaker's own voice, lip sync and checked captions, and turns one product photo into a finished 9:16 video ad.",
  /** How support signs. */
  supportName: "Clipelle support",
  /** Sender name on every outgoing e-mail; the address comes from EMAIL_FROM. */
  emailSenderName: "Clipelle",
  /** Author of the blog articles. */
  blogAuthor: "Clipelle Team",
} as const;

/** The public site's base URL (no trailing slash): NEXT_PUBLIC_SITE_URL, or the local dev server. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001").replace(/\/$/, "");
}

/** The support address, or null until NEXT_PUBLIC_SUPPORT_EMAIL is set: callers hide the link instead of inventing one. */
export function supportEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v && v.includes("@") ? v : null;
}

/** The sender for outgoing mail as "Clipelle <address>", or null when EMAIL_FROM is not set (mail is then only logged). */
export function emailFrom(): string | null {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) return null;
  // An address alone gets the brand as display name; a full "Name <address>" is kept as given.
  return raw.includes("<") ? raw : `${brand.emailSenderName} <${raw}>`;
}
