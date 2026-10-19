import {
  bigint,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
]);
export const costService = pgEnum("cost_service", ["heygen", "anthropic", "fal", "shotstack"]);
export const costStatus = pgEnum("cost_status", ["started", "completed", "failed"]);

/* ---------- JSON shapes stored in jsonb columns ---------- */

/** What the user entered. One shape per workflow; `workflow` on the row says which. */
export type AdInput = {
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
  reviewBeforeRender: boolean;
  /** Keep the source format or make it vertical. */
  format: "original" | "9:16";
  /** Optional picture enhancement before captions. */
  enhance: boolean;
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
    /** Null until user accounts exist (Stage 10). */
    ownerId: text("owner_id"),
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
    ...timestamps,
  },
  (t) => [index("projects_owner_created_idx").on(t.ownerId, t.createdAt), index("projects_status_idx").on(t.status)],
).enableRLS();

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
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
    status: stepStatus("status").default("waiting").notNull(),
    /** Subtitle fragments with original, machine translation and the user's text. */
    segments: jsonb("segments").$type<Segment[]>().default([]).notNull(),
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

/** The cost guard's log, moved from .reelay/cost-log.jsonl (same fields). */
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
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (t) => [index("cost_entries_fingerprint_idx").on(t.fingerprint, t.startedAt), index("cost_entries_started_idx").on(t.startedAt)],
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

/* ---------- inferred row types ---------- */

export type ProjectRow = typeof projects.$inferSelect;
export type StepRow = typeof steps.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type TranslationRow = typeof translations.$inferSelect;
export type CostEntryRow = typeof costEntries.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
