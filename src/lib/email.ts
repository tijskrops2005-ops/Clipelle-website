import "server-only";
import { emailFrom } from "@/lib/brand";

/**
 * The one place outgoing e-mail goes through. Without a provider configured it only logs the
 * subject and returns { sent: false }, so nothing breaks while e-mail is not set up.
 *
 * To enable: set EMAIL_FROM and RESEND_API_KEY in .env.local (Resend's HTTP API, no SDK needed).
 * Another provider can be plugged in here behind the same function.
 */
export type OutgoingEmail = { to: string; subject: string; text: string };

export async function sendEmail(mail: OutgoingEmail): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = emailFrom();
  if (!key || !from) {
    console.info(`[email] not configured; would send "${mail.subject}" to ${mail.to}`);
    return { sent: false, reason: "not_configured" };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return { sent: false, reason: `provider_${r.status}` };
  return { sent: true };
}

/** Where demo and contact requests are forwarded, when e-mail is configured. */
export function notifyAddress() {
  return process.env.NOTIFY_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || null;
}
