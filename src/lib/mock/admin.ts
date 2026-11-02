import type { CustomerRow } from "@/lib/customerFilters";
import type { AuditEntry } from "@/lib/adminAudit";
import type { PayoutPurchase } from "@/lib/payouts";

/**
 * Demo data for the admin pages (2 Nov 2026): demo mode has no accounts or database, so the
 * customer pages render these rows (labelled Demo) to show the layout. Invented names only here.
 */
const d = (daysAgo: number, hour = 10) => new Date(Date.UTC(2026, 10, 2 - daysAgo, hour)).toISOString();

export const mockCustomers: CustomerRow[] = [
  { userId: "demo-u1", workspaceId: "demo-w1", name: "Demo Customer", email: "demo@clipelle.local", signedUpAt: d(1), planKey: "pro", subscriptionStatus: "active", referredBy: "partner-demo", balance: 1_180, paidCents: 5_900, subscriptionPurchases: 1, topupPurchases: 0, lastActiveAt: d(0, 9), totpEnabled: true, deletionRequestedAt: null },
  { userId: "demo-u2", workspaceId: "demo-w2", name: null, email: "shop@example.test", signedUpAt: d(6), planKey: "free", subscriptionStatus: null, referredBy: null, balance: 30, paidCents: 0, subscriptionPurchases: 0, topupPurchases: 0, lastActiveAt: d(5), totpEnabled: false, deletionRequestedAt: null },
  { userId: "demo-u3", workspaceId: "demo-w3", name: "Agency Demo", email: "agency@example.test", signedUpAt: d(20), planKey: "scale", subscriptionStatus: "canceling", referredBy: null, balance: 2_410, paidCents: 15_900, subscriptionPurchases: 1, topupPurchases: 0, lastActiveAt: d(2), totpEnabled: false, deletionRequestedAt: null },
  { userId: "demo-u4", workspaceId: "demo-w4", name: "Top-up Demo", email: "topup@example.test", signedUpAt: d(12), planKey: "free", subscriptionStatus: null, referredBy: null, balance: -12, paidCents: 2_500, subscriptionPurchases: 0, topupPurchases: 1, lastActiveAt: d(1), totpEnabled: false, deletionRequestedAt: d(3) },
];

export const mockAudit: AuditEntry[] = [
  { id: "a1", adminEmail: "admin@clipelle.local", action: "credits_adjust", targetUserId: "demo-u4", targetWorkspaceId: "demo-w4", targetLabel: "topup@example.test", oldValue: { balance: 38 }, newValue: { balance: -12, credits: -50 }, reason: "Chargeback on the credit pack", createdAt: d(1, 14) },
  { id: "a2", adminEmail: "admin@clipelle.local", action: "view_start", targetUserId: "demo-u1", targetWorkspaceId: "demo-w1", targetLabel: "Demo Customer", oldValue: null, newValue: { expiresAt: d(0, 11) }, reason: null, createdAt: d(0, 10) },
  { id: "a3", adminEmail: "admin@clipelle.local", action: "view_end", targetUserId: "demo-u1", targetWorkspaceId: "demo-w1", targetLabel: "Demo Customer", oldValue: null, newValue: null, reason: null, createdAt: d(0, 10) },
  { id: "a4", adminEmail: "admin@clipelle.local", action: "limits_set", targetUserId: "demo-u3", targetWorkspaceId: "demo-w3", targetLabel: "Agency Demo", oldValue: {}, newValue: { dailyUsd: 250, concurrentProjects: 10 }, reason: "Launch week for three brands", createdAt: d(4, 16) },
];

export const mockPurchases: (PayoutPurchase & { id: string; workspaceId: string; item: string; credits: number; termsVersion: string | null; termsAcceptedAt: string | null })[] = [
  { id: "p1", workspaceId: "demo-w1", userId: "demo-u1", referredBy: "partner-demo", kind: "subscription", item: "Pro plan (monthly)", credits: 1_320, amountCents: 5_900, currency: "usd", status: "paid", createdAt: d(1, 9), termsVersion: "2026-10-29", termsAcceptedAt: d(1, 8) },
  { id: "p2", workspaceId: "demo-w3", userId: "demo-u3", referredBy: null, kind: "subscription", item: "Scale plan (monthly)", credits: 3_600, amountCents: 15_900, currency: "usd", status: "paid", createdAt: d(20, 9), termsVersion: "2026-10-21", termsAcceptedAt: d(20, 9) },
  { id: "p3", workspaceId: "demo-w4", userId: "demo-u4", referredBy: null, kind: "topup", item: "500 credits", credits: 500, amountCents: 2_500, currency: "usd", status: "paid", createdAt: d(10, 9), termsVersion: "2026-10-21", termsAcceptedAt: d(12, 9) },
];

export const mockLedger = [
  { id: "l1", createdAt: d(0, 9), credits: -56, kind: "settle", note: "Translation “Founder story — DE + FR”" },
  { id: "l2", createdAt: d(0, 9), credits: 56, kind: "refund", note: "Reserve released" },
  { id: "l3", createdAt: d(0, 8), credits: -56, kind: "reserve", note: "Translation “Founder story — DE + FR”" },
  { id: "l4", createdAt: d(1, 9), credits: 1_320, kind: "grant_subscription", note: "Pro plan (monthly)" },
  { id: "l5", createdAt: d(1, 8), credits: 30, kind: "grant_free", note: "Free credits after verification" },
];
