import { supportEmail } from "@/lib/brand";

/**
 * Where customers get help (25 Nov 2026, Tijs). Browser-safe; every channel is configuration, never
 * invented: a channel without its setting is simply not offered.
 *   - WhatsApp: NEXT_PUBLIC_SUPPORT_WHATSAPP, the business number in international format (digits,
 *     a leading + is fine). Opens WhatsApp on a phone and WhatsApp Web or the desktop app on a computer.
 *   - E-mail: NEXT_PUBLIC_SUPPORT_EMAIL (src/lib/brand.ts).
 *   - The assistant: NEXT_PUBLIC_SUPPORT_ASSISTANT=on (answers from Clipelle's own help texts).
 *   - The FAQ and the contact form always work.
 */
export const WHATSAPP_GREETING = "Hi Clipelle Support, I need help with...";

/** The WhatsApp number as digits only (8 to 15, E.164 without the +), or null when not set or not a number. */
export function supportWhatsApp(raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP): string | null {
  const digits = (raw ?? "").replace(/[\s().-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** A wa.me link with the greeting filled in; no personal details go into the address. */
export function whatsappHref(number: string, message = WHATSAPP_GREETING) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function assistantEnabled(raw = process.env.NEXT_PUBLIC_SUPPORT_ASSISTANT) {
  return raw?.trim().toLowerCase() === "on";
}

export type SupportChannel = { key: "assistant" | "whatsapp" | "email" | "faq" | "contact"; label: string; text: string; href?: string; external?: boolean };

/** The channels to show, in order of speed: assistant, WhatsApp, e-mail, then the FAQ and the form. */
export function supportChannels(env = { whatsapp: supportWhatsApp(), email: supportEmail(), assistant: assistantEnabled() }): SupportChannel[] {
  const out: SupportChannel[] = [];
  if (env.assistant) out.push({ key: "assistant", label: "Ask the assistant", text: "Answers about translating, editing, credits and errors, right away." });
  if (env.whatsapp) out.push({ key: "whatsapp", label: "Chat on WhatsApp", text: "Message our team directly.", href: whatsappHref(env.whatsapp), external: true });
  if (env.email) out.push({ key: "email", label: "E-mail support", text: env.email, href: `mailto:${env.email}` });
  out.push({ key: "faq", label: "Questions and answers", text: "Credits, file formats, processing times.", href: "/resources/faq" });
  if (!env.email) out.push({ key: "contact", label: "Contact form", text: "Send us a message.", href: "/contact" });
  return out;
}
