import { CUSTOM_CREDITS, customCreditsPrice, isPaidPlan } from "@/lib/plans";

/**
 * Auto-reload (26 Oct 2026, Tijs): when a workspace's balance drops below a chosen number of credits,
 * buy a chosen amount with the saved card, at most a few times a month. Off unless the owner turns it
 * on. Pure rules here (browser-safe); the charge itself is in src/lib/billingAutoReload.ts.
 */
export const AUTO_RELOAD_BELOW = [50, 100, 250, 500, 1000] as const;
export const AUTO_RELOAD_ADD = [500, 1000, 2500, 5000] as const;
export const AUTO_RELOAD_MONTHLY_MAX = [1, 3, 5, 10] as const;
/** Never twice within this window, whatever starts at the same moment. */
export const AUTO_RELOAD_COOLDOWN_MS = 10 * 60 * 1000;

export type AutoReloadSettings = { enabled: boolean; belowCredits: number; addCredits: number; monthlyMax: number };
export type AutoReload = AutoReloadSettings & {
  /** When the owner turned it on (their consent to charge the saved card). */
  consentAt?: string;
  /** "2026-10": the month the count belongs to. */
  month?: string;
  count?: number;
  lastAt?: string;
  /** Set when a reload payment failed; auto-reload is then switched off until the owner turns it on again. */
  failedAt?: string;
  lastError?: string;
};

export const DEFAULT_AUTO_RELOAD: AutoReloadSettings = { enabled: false, belowCredits: 100, addCredits: 1000, monthlyMax: 3 };

export function validAutoReload(s: AutoReloadSettings) {
  return (AUTO_RELOAD_BELOW as readonly number[]).includes(s.belowCredits) && (AUTO_RELOAD_ADD as readonly number[]).includes(s.addCredits) && (AUTO_RELOAD_MONTHLY_MAX as readonly number[]).includes(s.monthlyMax) && s.addCredits >= CUSTOM_CREDITS.min && s.addCredits <= CUSTOM_CREDITS.max;
}

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/** Whether a reload should start now, and why not when it should not. */
export function shouldAutoReload(input: { settings: AutoReload | null | undefined; balance: number; planKey: string; now: Date }): { go: true } | { go: false; reason: string } {
  const s = input.settings;
  if (!s?.enabled) return { go: false, reason: "off" };
  if (!isPaidPlan(input.planKey)) return { go: false, reason: "not on a paid plan" };
  if (input.balance >= s.belowCredits) return { go: false, reason: "balance high enough" };
  const sameMonth = s.month === monthKey(input.now);
  if (sameMonth && (s.count ?? 0) >= s.monthlyMax) return { go: false, reason: "monthly maximum reached" };
  if (s.lastAt && input.now.getTime() - new Date(s.lastAt).getTime() < AUTO_RELOAD_COOLDOWN_MS) return { go: false, reason: "cooling down" };
  return { go: true };
}

/** "Adds 1,000 credits ($50) when you drop below 100, at most 3 times a month." */
export function describeAutoReload(s: AutoReloadSettings, money: (amount: number) => string) {
  return `Adds ${s.addCredits.toLocaleString("en-US")} credits (${money(customCreditsPrice(s.addCredits))}) when your balance drops below ${s.belowCredits.toLocaleString("en-US")}, at most ${s.monthlyMax} ${s.monthlyMax === 1 ? "time" : "times"} a month.`;
}
