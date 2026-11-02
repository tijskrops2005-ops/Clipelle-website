/**
 * Gives a workspace credits by hand and, optionally, a plan (2 Nov 2026; Tijs's request for a
 * tester). Finds the account by e-mail, uses its personal workspace, adds a `grant_manual` ledger row
 * (idempotent on the reference, so running it twice adds nothing) and sets the plan on the workspace
 * (the profile keeps its mirror). No Stripe involved: the plan has no subscription and no monthly
 * credits of its own; it unlocks the plan's features.
 *   node --import tsx --conditions=react-server --env-file=.env.local scripts/grant-credits.mts <email> <credits> [planKey] [note]
 *   ... --env-file=.env.prod ...   (production, only when Tijs asks)
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { profiles, workspaces } from "../src/lib/db/schema";
import { getCreditBalance, grantCredits } from "../src/lib/credits";
import { planByKey } from "../src/lib/plans";

const [email, creditsArg, planKey, note] = process.argv.slice(2);
const credits = Number(creditsArg);
if (!email || !Number.isFinite(credits) || credits <= 0) {
  console.error("usage: grant-credits.mts <email> <credits> [planKey] [note]");
  process.exit(1);
}
if (planKey && !planByKey(planKey)) {
  console.error(`unknown plan: ${planKey}`);
  process.exit(1);
}

const [profile] = await db().select().from(profiles).where(sql`lower(${profiles.email}) = ${email.toLowerCase()}`).limit(1);
if (!profile) {
  console.error(`no account with the e-mail ${email}`);
  process.exit(1);
}
const [workspace] = await db().select().from(workspaces).where(and(eq(workspaces.ownerUserId, profile.userId), eq(workspaces.kind, "personal"))).limit(1);
if (!workspace) {
  console.error(`no personal workspace for ${email}`);
  process.exit(1);
}

const day = new Date().toISOString().slice(0, 10);
const reference = `manual:${day}:${profile.userId}:${credits}`;
const before = await getCreditBalance(workspace.id);
await grantCredits({ workspaceId: workspace.id, userId: profile.userId, credits, kind: "grant_manual", note: note ?? "Credits added by Clipelle", expiresAt: null, reference });
if (planKey) {
  await db().update(workspaces).set({ planKey, updatedAt: new Date() }).where(eq(workspaces.id, workspace.id));
  await db().update(profiles).set({ planKey, updatedAt: new Date() }).where(eq(profiles.userId, profile.userId));
}
const after = await getCreditBalance(workspace.id);
console.log(`${email}: credits ${before} → ${after}${planKey ? `, plan ${workspace.planKey} → ${planKey}` : ""} (reference ${reference})`);
process.exit(0);
