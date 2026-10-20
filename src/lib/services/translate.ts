import "server-only";
import { heygenFetch, HeygenError } from "@/lib/services/heygen";
import type { LanguageCode, TranslationQuality } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import {
  HEYGEN_PROOFREAD_USD_PER_SECOND,
  HEYGEN_TRANSLATE_USD_PER_SECOND,
} from "@/lib/translatePricing";

/**
 * Workflow B, step "Translate" — HeyGen v3 Video Translation with a proofread session (server-only).
 *
 * Flow (verified against developers.heygen.com on 2026-10-19, see docs/vendors/heygen/capabilities.md §4.1):
 *   POST /v3/assets (multipart, ≤ 32 MB)                  → asset_id for the source video
 *   POST /v3/video-translations/proofreads                 → one proofread_id per target language   (paid: proofread rate)
 *   GET  /v3/video-translations/proofreads/{id}            → status processing | completed | failed, input_language
 *   GET  /v3/video-translations/proofreads/{id}/srt        → srt_url (translated subtitles)
 *   PUT  /v3/video-translations/proofreads/{id}/srt        → {srt: {type: asset_id}} (edited subtitles)
 *   POST /v3/video-translations/proofreads/{id}/generate   → video_translation_id                      (paid: translation rate)
 *   GET  /v3/video-translations/{id}                       → status pending | running | completed | failed, video_url, srt_caption_url
 *
 * The docs put no plan restriction on this flow (only a custom SRT *at creation* is "Enterprise plan only").
 * Whether the pay-as-you-go account may edit the SRT is only proven by the first real PUT; isPlanRestriction()
 * recognises that refusal so the UI can say so in plain language.
 */

/* ---------- types ---------- */

export type ProofreadStatus = "processing" | "completed" | "failed";

export type Proofread = {
  id: string;
  title?: string | null;
  status: ProofreadStatus;
  output_language?: string | null;
  input_language?: string | null;
  submitted_for_review?: boolean | null;
  created_at?: number | null;
  failure_message?: string | null;
};

export type TranslationStatus = "pending" | "running" | "processing" | "completed" | "failed";

export type VideoTranslation = {
  id: string;
  status: TranslationStatus;
  video_url?: string | null;
  srt_caption_url?: string | null;
  vtt_caption_url?: string | null;
  failure_message?: string | null;
};

export type Asset = { asset_id: string; url: string; mime_type?: string; size_bytes?: number };

/** One subtitle cue as the service delivers it (seconds). */
export type SrtCue = { index: number; start: number; end: number; text: string };

/** HeyGen `POST /v3/assets` accepts files up to 32 MB (mp4, webm, mp3, wav, png, jpeg, pdf, srt). */
export const HEYGEN_ASSET_MAX_BYTES = 32 * 1024 * 1024;

/* ---------- assets ---------- */

export async function uploadHeygenAsset(input: { file: Blob; filename: string }): Promise<Asset> {
  if (input.file.size > HEYGEN_ASSET_MAX_BYTES) {
    throw new HeygenError(
      `This file is ${(input.file.size / (1024 * 1024)).toFixed(1)} MB; HeyGen accepts uploads up to 32 MB. Trim the video or export it at a lower bitrate.`,
      413,
      "file_too_large",
    );
  }
  const form = new FormData();
  form.append("file", input.file, input.filename);
  return heygenFetch<Asset>("/v3/assets", { method: "POST", body: form });
}

/* ---------- languages ---------- */

export async function listTranslationLanguages(): Promise<string[]> {
  const data = await heygenFetch<{ languages?: string[] } | string[]>("/v3/video-translations/languages");
  return Array.isArray(data) ? data : (data.languages ?? []);
}

/**
 * The docs are ambiguous on whether the list holds names ("Spanish") or codes ("es"),
 * so we match our five languages against the live list both ways.
 */
export function matchLanguages(live: string[]): Record<LanguageCode, string | null> {
  const lower = new Set(live.map((l) => l.toLowerCase().trim()));
  const out: Record<LanguageCode, string | null> = {};
  for (const lang of LANGUAGES) out[lang.code] = lower.has(lang.heygenName.toLowerCase()) ? lang.heygenName : null;
  return out;
}

/* ---------- proofread sessions ---------- */

export type CreateProofreadInput = {
  video: { assetId: string } | { url: string };
  /** HeyGen language values, as returned by the languages endpoint. */
  outputLanguages: string[];
  mode: TranslationQuality;
  title: string;
  speakerNum?: number;
  idempotencyKey?: string;
};

export async function createProofread(input: CreateProofreadInput) {
  const data = await heygenFetch<{ proofread_ids: string[]; status?: ProofreadStatus }>("/v3/video-translations/proofreads", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey ?? crypto.randomUUID() },
    body: JSON.stringify({
      video: "assetId" in input.video ? { type: "asset_id", asset_id: input.video.assetId } : { type: "url", url: input.video.url },
      output_languages: input.outputLanguages,
      mode: input.mode,
      title: input.title,
      ...(input.speakerNum ? { speaker_num: input.speakerNum } : {}),
    }),
  });
  return data;
}

export async function getProofread(id: string) {
  return heygenFetch<Proofread>(`/v3/video-translations/proofreads/${encodeURIComponent(id)}`);
}

export async function downloadProofreadSrt(id: string) {
  return heygenFetch<{ srt_url: string; original_srt_url?: string | null }>(
    `/v3/video-translations/proofreads/${encodeURIComponent(id)}/srt`,
  );
}

/** Fetches the subtitle file behind a presigned URL. */
export async function fetchSrtText(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new HeygenError(`Could not download the subtitle file (${res.status}).`, 502, "srt_download_failed");
  return res.text();
}

export async function uploadProofreadSrt(id: string, srt: { assetId: string } | { url: string }) {
  return heygenFetch<Proofread>(`/v3/video-translations/proofreads/${encodeURIComponent(id)}/srt`, {
    method: "PUT",
    body: JSON.stringify({ srt: "assetId" in srt ? { type: "asset_id", asset_id: srt.assetId } : { type: "url", url: srt.url } }),
  });
}

export async function generateFromProofread(id: string, opts: { idempotencyKey?: string; callbackUrl?: string } = {}) {
  return heygenFetch<{ video_translation_id: string; status?: TranslationStatus }>(
    `/v3/video-translations/proofreads/${encodeURIComponent(id)}/generate`,
    {
      method: "POST",
      headers: { "Idempotency-Key": opts.idempotencyKey ?? crypto.randomUUID() },
      body: JSON.stringify(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}),
    },
  );
}

export async function getTranslation(id: string) {
  return heygenFetch<VideoTranslation>(`/v3/video-translations/${encodeURIComponent(id)}`);
}

/**
 * True when HeyGen refused because of the account's plan (e.g. SRT editing on a non-Enterprise account).
 * HeyGen does not document the exact code, so we look at the status and the wording.
 */
export function isPlanRestriction(error: unknown) {
  if (!(error instanceof HeygenError)) return false;
  const text = `${error.code ?? ""} ${error.message}`.toLowerCase();
  return error.status === 403 || /enterprise|plan|permission|not allowed|forbidden/.test(text);
}

/* ---------- SRT parsing and building ---------- */

function srtTimeToSeconds(t: string) {
  const m = /^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(t.trim());
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, "0")) / 1000;
}

function secondsToSrtTime(s: number) {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
}

/** Parses SRT text into cues. Tolerates CRLF, missing indices and blank lines inside a cue. */
export function parseSrt(text: string): SrtCue[] {
  const blocks = text.replace(/\r/g, "").replace(/^﻿/, "").split(/\n{2,}/);
  const cues: SrtCue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd()).filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
    if (lines.length === 0) continue;
    let i = 0;
    if (/^\d+$/.test(lines[0].trim())) i = 1;
    const timing = /^(\S+)\s*-->\s*(\S+)/.exec(lines[i] ?? "");
    if (!timing) continue;
    const start = srtTimeToSeconds(timing[1]);
    const end = srtTimeToSeconds(timing[2]);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    const body = lines.slice(i + 1).join("\n").trim();
    cues.push({ index: cues.length + 1, start, end, text: body });
  }
  return cues;
}

/** Builds SRT text; times are kept exactly, only the text comes from the user. */
export function buildSrt(cues: SrtCue[]) {
  return (
    cues
      .map((c, i) => `${i + 1}\n${secondsToSrtTime(c.start)} --> ${secondsToSrtTime(c.end)}\n${c.text.trim().replace(/\n{2,}/g, "\n")}`)
      .join("\n\n") + "\n"
  );
}

/**
 * Lines up a transcript (source language) with translated cues by time overlap, so the review
 * screen can show the original text next to each translated fragment even when the two files
 * segment the speech differently. Returns one string per translated cue.
 */
export function alignOriginalText(translated: SrtCue[], transcript: SrtCue[]): string[] {
  return translated.map((cue) => {
    const parts = transcript.filter((t) => Math.min(t.end, cue.end) - Math.max(t.start, cue.start) > 0.15);
    if (parts.length === 0) {
      // No overlap (different timing base): fall back to the cue with the same index.
      return transcript[cue.index - 1]?.text ?? "";
    }
    return parts.map((p) => p.text).join(" ");
  });
}

/* ---------- cost estimates (indicative, enterprise rate card) ---------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A proofread session is billed per target language on the source duration. */
export function estimateProofreadUsd(seconds: number, languageCount: number) {
  return round2(Math.max(1, seconds) * HEYGEN_PROOFREAD_USD_PER_SECOND * Math.max(1, languageCount));
}

/** The final render is billed per target language on the source duration. */
export function estimateGenerateUsd(seconds: number, mode: TranslationQuality) {
  return round2(Math.max(1, seconds) * HEYGEN_TRANSLATE_USD_PER_SECOND[mode]);
}
