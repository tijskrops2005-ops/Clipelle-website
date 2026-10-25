import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { LanguageCode, Segment, TranslationQuality } from "@/lib/types";

/**
 * Stage 8 — database schema (Postgres on Supabase, managed with Drizzle).
 *
 * The database is the single source of truth for every real project. The UI only reads;
 * the orchestrator (Inngest functions) writes. Mock data in src/lib/mock never touches this.
 *
 * Changing this file: `npm run db:generate` writes a migration into ./drizzle,
 * `npm run db:migrate` applies it (uses DIRECT_DATABASE_URL, the session pooler).
 *
 * Security: every table has row-level security enabled with no policies, and the
 * migration 0001 revokes all grants from the `anon` and `authenticated` roles. The app
 * reaches the tables only through the server-side Postgres connection; the Data API
 * with the publishable key cannot read or write them (verified live on /dev/db).
 */

/* ---------- enums (values mirror src/lib/types.ts) ---------- */

export const workflowKind = pgEnum("workflow_kind", ["ad", "translate"]);
export const projectStatus = pgEnum("project_status", ["draft", "processing", "review", "completed", "failed"]);
export const stepStatus = pgEnum("step_status", ["waiting", "processing", "completed", "failed", "needs_input"]);
export const assetKind = pgEnum("asset_kind", [
  "source", // uploaded video (workflow B)
  "image", // uploaded product photo (workflow A)
  "script", // generated script JSON
  "product_clip",
  "presenter",
  "final", // finished ad (A)
  "translated", // HeyGen translated video (B)
  "srt", // subtitle file (B)
  "enhanced", // after picture enhancement (B)
  "captioned", // finished translated video with captions (B)
  "background", // customer's own presenter background image (A)
  "logo", // customer's logo for the final edit (A)
]);
export const costService = pgEnum("cost_service", ["heygen", "anthropic", "fal", "shotstack"]);
export const costStatus = pgEnum("cost_status", ["started", "completed", "failed"]);

/* ---------- JSON shapes stored in jsonb columns ---------- */

/** What the user entered. One shape per workflow; `workflow` on the row says which. */
export type AdInput = {
  /** Chosen ad length in seconds (AD_LENGTHS in src/lib/pricing.ts). Missing on older rows = 30. */
  seconds?: number;
  /** Presenter quality chosen by the customer: avatar_iii = Standard, avatar_iv = Premium. Missing = Premium. */
  engine?: "avatar_iii" | "avatar_iv";
  /** Chosen presenter look id (HeyGen look). Missing = HEYGEN_DEFAULT_LOOK_ID. */
  lookId?: string;
  /** Script, caption and voice language (AdLanguageCode). Missing = AD_LANGUAGE. */
  language?: string;
  /** Accent key for the voice (voice-name based), optional. */
  accent?: string;
  /** Chosen voice id. Missing = the look's default voice when it fits the language. */
  voiceId?: string;
  /** slower | normal | faster → HeyGen voice_settings.speed 0.9 | 1 | 1.1. */
  speed?: string;
  /** Offer for the CTA (max 80 chars). Missing/empty = no offer mentioned. */
  offer?: string;
  /** Free direction (max 200 chars), treated as data. */
  direction?: string;
  /** elegant | playful | direct | warm. Missing = direct. */
  tone?: string;
  /** Presenter background: a solid colour or the customer's image. Missing = the look's own background. */
  background?: { type: "color"; value: string } | { type: "image"; assetId: string };
  /** Brand style for the final edit. Missing fields = app defaults. */
  brand?: { accent?: string; captionStyle?: string; font?: string; logoAssetId?: string };
  /** Pause after the script for the customer's approval (before the paid presenter/clip steps). */
  reviewScript?: boolean;
  /** Format key from the library; informational (the format only filled direction and tone). */
  format?: string;
  /** Hook style of a batch variation; informational (it only filled the direction). */
  hook?: string;
  productName: string;
  productUrl?: string;
  description: string;
  script?: string;
  /** Asset ids of the uploaded product photos, in order. */
  imageAssetIds: string[];
};

export type TranslateInput = {
  sourceFileName: string;
  sourceSeconds: number;
  sourceAssetId: string;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  /** "Review before rendering": pause for the user's corrections. Off: Claude rewrites in ad tone automatically. */
  /** Terms that must stay untranslated (brand and product names); sent as a brand glossary. */
  keepTerms?: string[];
  /** Cut silence longer than ~0.3 s at the start and the end (default on); lip-sync is untouched. */
  trimSilence?: boolean;
  /** Where the captions sit: "low" (above the bottom 15%) or "middle". */
  captionPosition?: "low" | "middle";
  /** Keep the source format or make it vertical. */
  format: "original" | "9:16";
  /** Optional picture enhancement before captions. */
  enhance: boolean;
  /** "Localize this ad": the source is an ad the customer generated here, so the rights are recorded as such. */
  rightsBasis?: "own_upload" | "generated";
};

export type ProjectInput = AdInput | TranslateInput;

/* ---------- tables ---------- */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** The account that owns the project (Supabase Auth user id). Backfilled rows carry the dev user. */
    ownerId: text("owner_id"),
    /** Isolation key since 2026-10-21: every project belongs to one workspace (personal or team). */
    workspaceId: uuid("workspace_id"),
    workflow: workflowKind("workflow").notNull(),
    name: text("name").notNull(),
    status: projectStatus("status").default("draft").notNull(),
    input: jsonb("input").$type<ProjectInput>().notNull(),
    /** Detected or chosen source language once the translate step has run (B). */
    detectedLanguage: text("detected_language"),
    /** Rule 7 in CLAUDE.md: a translate project cannot exist without this. */
    rightsConfirmedAt: timestamp("rights_confirmed_at", { withTimezone: true }),
    /** Asset id of the finished ad (A). B keeps its results per language in `translations`. */
    finalAssetId: uuid("final_asset_id"),
    /** Versions of one ad point at the first ad (root); a translation made from an ad points at that ad. */
    parentId: uuid("parent_id"),
    /** 1 for the first ad of a group, counting up per "Make another version". */
    version: integer("version").default(1).notNull(),
    /** "Make variations": the batch this project is part of. */
    batchId: uuid("batch_id"),
    /** When the "ready" or "failed" e-mail went out (or was skipped by choice); one per project. */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    /** Organisation (2026-10-21): archived projects leave the lists but keep everything; tags for search. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    tags: jsonb("tags").$type<string[]>(),
    ...timestamps,
  },
  (t) => [index("projects_owner_created_idx").on(t.ownerId, t.createdAt), index("projects_status_idx").on(t.status), index("projects_parent_idx").on(t.parentId), index("projects_batch_idx").on(t.batchId)],
).enableRLS();

/** "Make variations" (2026-10-21): 2–5 variants of one product, each its own project and run. */
export const projectBatches = pgTable(
  "project_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    name: text("name").notNull(),
    /** processing | completed | partial (some failed) | failed; refreshed when a variant finishes. */
    status: text("status").default("processing").notNull(),
    /** When the one batch e-mail went out. */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("project_batches_workspace_idx").on(t.workspaceId, t.createdAt)],
).enableRLS();

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Copy of projects.owner_id so every row can be checked on its own. */
    userId: text("user_id"),
    /** Generic step key: script | productClip | presenter | finalEdit, or upload | translate | review | enhance | captions. */
    key: text("key").notNull(),
    status: stepStatus("status").default("waiting").notNull(),
    attempt: integer("attempt").default(1).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** Plain-language message for the user when status is failed. */
    error: text("error"),
    /** Id at the provider (HeyGen video id, fal request id, Shotstack render id, proofread id). */
    externalJobId: text("external_job_id"),
    /** Step-specific result pointers, e.g. { assetId } or { assetIds: {de, fr} }. */
    output: jsonb("output").$type<Record<string, unknown>>(),
    costUsd: doublePrecision("cost_usd"),
    ...timestamps,
  },
  (t) => [uniqueIndex("steps_project_key_idx").on(t.projectId, t.key)],
).enableRLS();

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").references(() => steps.id, { onDelete: "set null" }),
    userId: text("user_id"),
    kind: assetKind("kind").notNull(),
    language: text("language"),
    /** Path inside our storage bucket. Provider URLs are never stored: they expire. */
    storagePath: text("storage_path").notNull(),
    mime: text("mime").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    seconds: real("seconds"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("assets_project_idx").on(t.projectId), uniqueIndex("assets_storage_path_idx").on(t.storagePath)],
).enableRLS();

export const translations = pgTable(
  "translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    language: text("language").$type<LanguageCode>().notNull(),
    userId: text("user_id"),
    status: stepStatus("status").default("waiting").notNull(),
    /** Subtitle fragments with original, machine translation and the user's text. */
    segments: jsonb("segments").$type<Segment[]>().default([]).notNull(),
    /** Plain-language reason when this language version stopped (e.g. its budget was reached). */
    error: text("error"),
    /** Automatic quality check: corrections applied and warnings for the customer. */
    qa: jsonb("qa").$type<{ changes: { index: number; before: string; after: string; reason: string }[]; warnings: string[]; summary?: string; costUsd?: number }>(),
    proofreadId: text("proofread_id"),
    translationId: text("translation_id"),
    videoAssetId: uuid("video_asset_id").references(() => assets.id, { onDelete: "set null" }),
    srtAssetId: uuid("srt_asset_id").references(() => assets.id, { onDelete: "set null" }),
    enhancedAssetId: uuid("enhanced_asset_id").references(() => assets.id, { onDelete: "set null" }),
    captionedAssetId: uuid("captioned_asset_id").references(() => assets.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("translations_project_language_idx").on(t.projectId, t.language)],
).enableRLS();

/** The cost guard's log (src/lib/services/costGuard.ts). One row per paid action. */
export const costEntries = pgTable(
  "cost_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    service: costService("service").notNull(),
    action: text("action").notNull(),
    estimatedUsd: doublePrecision("estimated_usd").notNull(),
    actualUsd: doublePrecision("actual_usd"),
    status: costStatus("status").default("started").notNull(),
    /** sha256 of service + action + inputs; blocks an identical paid call within 10 minutes. */
    fingerprint: text("fingerprint").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    stepId: uuid("step_id").references(() => steps.id, { onDelete: "set null" }),
    /** Owner of the project at the time of the call; lets the per-user limits sum quickly. */
    userId: text("user_id"),
    /** Language version this cost belongs to (Workflow B); null = shared by the whole project. */
    language: text("language"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (t) => [index("cost_entries_fingerprint_idx").on(t.fingerprint, t.startedAt), index("cost_entries_started_idx").on(t.startedAt), index("cost_entries_project_idx").on(t.projectId)],
).enableRLS();

/** Every webhook delivery, stored before it is acted on. The unique index makes duplicates harmless. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(), // heygen | fal | shotstack
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [uniqueIndex("webhook_events_dedupe_idx").on(t.provider, t.externalId, t.eventType)],
).enableRLS();

/**
 * Public, read-only viewing links for a finished video (2026-10-21): an unguessable token, an
 * expiry, optional download, revocable. The share page shows the video and its name, nothing else.
 */
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    /** 32 random bytes, base64url; only its hash is compared on lookup. */
    tokenHash: text("token_hash").notNull(),
    /** Workflow B: which language version; null = the ad's final video. */
    language: text("language"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    allowDownload: boolean("allow_download").default(false).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    views: integer("views").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("share_links_token_idx").on(t.tokenHash), index("share_links_project_idx").on(t.projectId)],
).enableRLS();

/**
 * Outgoing webhooks of the public API (2026-10-21): per workspace, HTTPS URLs that receive
 * project.completed and project.failed with an HMAC signature. The secret must be readable to
 * sign deliveries, so it lives here (server-only table, default-deny RLS) and is shown once.
 */
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    secret: text("secret").notNull(),
    active: boolean("active").default(true).notNull(),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    lastStatus: text("last_status"),
    ...timestamps,
  },
  (t) => [index("webhook_endpoints_workspace_idx").on(t.workspaceId)],
).enableRLS();

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull(),
    event: text("event").notNull(),
    projectId: uuid("project_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempt: integer("attempt").default(0).notNull(),
    /** pending | delivered | failed */
    status: text("status").default("pending").notNull(),
    responseStatus: integer("response_status"),
    error: text("error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("webhook_deliveries_endpoint_idx").on(t.endpointId, t.createdAt), index("webhook_deliveries_workspace_idx").on(t.workspaceId, t.createdAt)],
).enableRLS();

/** One row per account: profile fields and the brand defaults that prefill the ad form. */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    /** Defaults for the ad form's brand style; the form still sends exactly what the customer picked. */
    brand: jsonb("brand").$type<{ accent?: string; captionStyle?: string; font?: string; logoPath?: string }>(),
    /** Plan state mirrored from the payment provider (Part 3). */
    planKey: text("plan_key").default("free").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** When the one free ad was granted; null = not yet. */
    freeAdGrantedAt: timestamp("free_ad_granted_at", { withTimezone: true }),
    /** E-mail when a video is ready or fails (Settings → Profile). Default on; no marketing ever. */
    notifyEmail: boolean("notify_email").default(true).notNull(),
    ...timestamps,
  },
).enableRLS();

/** Credit ledger per account (src/lib/credits.ts): grants, reservations, settlements, refunds. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** The acting user (who spent or received); the balance is per workspace. */
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** Positive = added, negative = taken. */
    credits: integer("credits").notNull(),
    kind: text("kind").notNull(), // grant_free | grant_subscription | grant_topup | grant_manual | reserve | settle | refund | expire
    note: text("note"),
    /** Idempotency key for grants from webhooks (e.g. a Stripe event or invoice id). */
    reference: text("reference"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("credit_ledger_user_idx").on(t.userId, t.createdAt), index("credit_ledger_workspace_idx").on(t.workspaceId, t.createdAt), index("credit_ledger_project_idx").on(t.projectId), uniqueIndex("credit_ledger_user_reference_idx").on(t.userId, t.reference)],
).enableRLS();

/** "Notify me" wishes for connections that do not exist yet (Settings → Connections). */
export const notifyWishes = pgTable(
  "notify_wishes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    feature: text("feature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("notify_wishes_user_feature_idx").on(t.userId, t.feature)],
).enableRLS();

/** Book-a-demo and contact requests from the public site. Raw addresses are never stored (ip is hashed). */
export const demoRequests = pgTable(
  "demo_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(), // demo | contact
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    goal: text("goal"),
    message: text("message"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    status: text("status").default("new").notNull(), // new | answered | spam
    emailed: text("emailed"), // "sent" | "not_configured" | provider error
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("demo_requests_created_idx").on(t.createdAt), index("demo_requests_email_idx").on(t.email)],
).enableRLS();

/* ---------- inferred row types ---------- */

export type ProjectRow = typeof projects.$inferSelect;
export type StepRow = typeof steps.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type TranslationRow = typeof translations.$inferSelect;
export type CostEntryRow = typeof costEntries.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type DemoRequestRow = typeof demoRequests.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type CreditLedgerRow = typeof creditLedger.$inferSelect;

/**
 * Shared counters for rate limits (sign-in, sign-up, demo requests) so a limit holds across
 * every server instance. One row per key and fixed window; expired rows are swept on the fly.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_expires_idx").on(t.expiresAt)],
).enableRLS();

/** API keys for the public API (Settings → API keys). Only the SHA-256 hash is stored; the key is shown once. */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Who created the key; the key acts within its workspace. */
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    name: text("name").notNull(),
    /** First characters of the key, for recognising it in the list (never enough to use it). */
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash), index("api_keys_user_idx").on(t.userId)],
).enableRLS();

/** Idempotency records for the public API: the same key + Idempotency-Key returns the same project. */
export const apiIdempotency = pgTable(
  "api_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keyId: uuid("key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
    idemKey: text("idem_key").notNull(),
    requestHash: text("request_hash").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("api_idempotency_key_idx").on(t.keyId, t.idemKey)],
).enableRLS();

/** Waitlist wishes for integrations that are announced but not built (Slack bot, Ad Launcher). One row per e-mail and feature. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feature: text("feature").notNull(),
    email: text("email").notNull(),
    userId: text("user_id"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("waitlist_feature_email_idx").on(t.feature, t.email), index("waitlist_created_idx").on(t.createdAt)],
).enableRLS();

/** Open applications from /careers while there are no open roles. Raw addresses are never stored. */
export const careerInterests = pgTable(
  "career_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    area: text("area"),
    link: text("link"),
    message: text("message"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("career_interests_created_idx").on(t.createdAt)],
).enableRLS();

/**
 * Workspaces (21 October 2026): every user has a personal workspace; a team workspace is shared.
 * Projects, credits, API keys and billing belong to a workspace. profiles keeps its old billing
 * columns only as a historical copy; the workspace row is the source of truth.
 */
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull(), // personal | team
    ownerUserId: text("owner_user_id").notNull(),
    planKey: text("plan_key").default("free").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("workspaces_owner_idx").on(t.ownerUserId),
    index("workspaces_customer_idx").on(t.stripeCustomerId),
    // One personal workspace per user, even when several requests create it at the same moment (24 Oct 2026).
    uniqueIndex("workspaces_personal_owner_uq").on(t.ownerUserId).where(sql`kind = 'personal'`),
  ],
).enableRLS();

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // owner | member
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("workspace_members_unique_idx").on(t.workspaceId, t.userId), index("workspace_members_user_idx").on(t.userId)],
).enableRLS();

/** Invitations by e-mail; only the token hash is stored, the link is shown once (or mailed). */
export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("workspace_invites_token_idx").on(t.tokenHash), index("workspace_invites_workspace_idx").on(t.workspaceId)],
).enableRLS();

export type WorkspaceRow = typeof workspaces.$inferSelect;

/** Requests for the managed service (/services/done-for-you). Raw addresses are never stored. */
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    sells: text("sells"),
    adsPerMonth: text("ads_per_month"),
    message: text("message"),
    ipHash: text("ip_hash"),
    status: text("status").default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("service_requests_created_idx").on(t.createdAt)],
).enableRLS();
