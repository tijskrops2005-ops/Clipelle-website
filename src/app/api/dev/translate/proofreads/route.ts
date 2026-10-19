import type { LanguageCode, TranslationQuality } from "@/lib/types";
import { LANGUAGES, languageOf } from "@/lib/languages";
import { balanceOf, getAccount } from "@/lib/services/heygen";
import { createProofread, estimateProofreadUsd, listTranslationLanguages, matchLanguages } from "@/lib/services/translate";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse, requireRights } from "../_guard";

type Body = {
  assetId?: string;
  seconds?: number;
  sourceLanguage?: LanguageCode | "auto";
  targetLanguages?: LanguageCode[];
  mode?: TranslationQuality;
  confirmed?: boolean;
  rightsConfirmed?: boolean;
};

const CODES = new Set(LANGUAGES.map((l) => l.code));

/**
 * Paid: starts one proofread session for all target languages. When the source language is
 * known, it is added as an extra output language so we get a same-language transcript for the
 * "original" column of the review screen (one more proofread fee, no extra endpoint).
 */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rights = requireRights(body.rightsConfirmed);
  if (rights) return rights;
  if (body.confirmed !== true) return Response.json({ error: "Confirmation required before starting a paid proofread session." }, { status: 400 });
  if (!body.assetId) return Response.json({ error: "Upload the video first." }, { status: 400 });
  const seconds = Number(body.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) return Response.json({ error: "Video length (seconds) is required, max 600." }, { status: 400 });
  const targets = (body.targetLanguages ?? []).filter((c) => CODES.has(c));
  if (targets.length === 0) return Response.json({ error: "Choose at least one target language." }, { status: 400 });
  const mode: TranslationQuality = body.mode === "precision" ? "precision" : "speed";
  const source = body.sourceLanguage && body.sourceLanguage !== "auto" && CODES.has(body.sourceLanguage) ? body.sourceLanguage : null;

  try {
    const matched = matchLanguages(await listTranslationLanguages());
    const outputs: { code: LanguageCode; heygen: string; role: "target" | "transcript" }[] = [];
    for (const code of targets) {
      const heygen = matched[code];
      if (!heygen) return Response.json({ error: `HeyGen does not list ${languageOf(code).label} as a target language.` }, { status: 400 });
      if (code !== source) outputs.push({ code, heygen, role: "target" });
    }
    if (source && matched[source]) outputs.push({ code: source, heygen: matched[source]!, role: "transcript" });

    const estimateUsd = estimateProofreadUsd(seconds, outputs.length);
    let entryId = "";
    let fingerprint = "";
    try {
      const reserved = await reserveSpend({
        service: "heygen",
        action: "translate_proofread",
        estimatedUsd: estimateUsd,
        fingerprintInput: { assetId: body.assetId, outputs: outputs.map((o) => o.heygen), mode },
        meta: { seconds, mode, languages: outputs.length },
      });
      entryId = reserved.entryId;
      fingerprint = reserved.fingerprint;
    } catch (error) {
      const refused = costGuardResponse(error);
      if (refused) return refused;
      throw error;
    }

    const before = balanceOf(await getAccount());
    try {
      const created = await createProofread({
        video: { assetId: body.assetId },
        outputLanguages: outputs.map((o) => o.heygen),
        mode,
        title: `Reelay translate test · ${new Date().toISOString()}`,
        idempotencyKey: fingerprint,
      });
      // HeyGen returns the ids in the order of output_languages.
      const sessions = outputs.map((o, i) => ({ ...o, proofreadId: created.proofread_ids[i] }));
      if (sessions.some((s) => !s.proofreadId)) throw new Error("HeyGen returned fewer proofread ids than languages.");
      return Response.json({ sessions, balanceBefore: before, estimateUsd, entryId, startedAt: new Date().toISOString() });
    } catch (error) {
      await settleSpend(entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
