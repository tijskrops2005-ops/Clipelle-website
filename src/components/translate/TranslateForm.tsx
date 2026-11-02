"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, FileVideo, Languages, Loader2, Lock, Plus, ShieldCheck, X } from "lucide-react";
import { config } from "@/lib/config";
import type { AdProject, LanguageCode, TranslateProject, TranslationQuality } from "@/lib/types";
import { isTranslateLanguage, TOP_LANGUAGES } from "@/lib/translateLanguages";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { cn, formatDate } from "@/lib/utils";
import { LANGUAGES, languageOf } from "@/lib/languages";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { estimateTranslateCost, sourceTranscriptEnabled } from "@/lib/pricing";
import { Badge } from "@/components/ui/Badge";
import { createTranslateProject, discardStaged, stageUpload } from "@/lib/data/client";
import type { StagedUpload } from "@/lib/data/uploads";
import { clearScopedDraft, readScopedDraft, useDraftSaver, useDraftScope } from "@/lib/forms/DraftScope";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { Button } from "@/components/ui/Button";
import { Field, controlClass, controlStateClass } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { Textarea } from "@/components/ui/Textarea";
import { VideoDropzone, formatDuration, type UploadedVideo } from "@/components/ui/VideoDropzone";
import { buildTranslateDraft, cleanReplace, validateTranslateForm, type TranslateFormErrors } from "@/lib/forms/translateDraft";
import { projectNameFromFile } from "@/lib/forms/projectName";
import { lastChoicesSummary, readLastChoices, writeLastChoices, type LastChoices } from "@/lib/forms/lastChoices";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionCard } from "@/components/ui/SectionCard";
import { OptionCard, OptionGrid } from "@/components/ui/OptionCard";
import { Disclosure } from "@/components/ui/Disclosure";
import { SummaryPanel } from "@/components/ui/SummaryPanel";
import { CaptionStylePicker } from "@/components/translate/CaptionStylePicker";
import { DEFAULT_PRESENTER_TRANSLATE, PresenterSetup } from "@/components/translate/PresenterSetup";
import { PRESENTER_LANGUAGES, type PresenterTranslate } from "@/lib/presenterTranslate";
import { AD_LANGUAGES, type AdLanguageCode } from "@/lib/voiceOptions";
import { DEFAULT_CAPTION_STYLE, type CaptionStyleChoice } from "@/lib/captionOptions";
import { CREDIT_RULES, FEATURE_PLAN, hasFeature, translateCredits, type PlanFeature } from "@/lib/plans";
import { PlanHint } from "@/components/PlanHint";
import { getAccountStatus } from "@/lib/data/settingsClient";

type Errors = TranslateFormErrors;

/**
 * Plain-language description of the two modes. Only what the service documents (2026-10-20):
 * Speed = standard lip-sync, "adequate" translation, best for faces with little movement and
 * quick drafts, faster. Precision = the mouth is re-rendered with avatar models for significantly
 * more realistic lip-sync, context- and gender-aware translation, best for faces that move,
 * side angles, partly covered mouths and more than one speaker; slower. Customers see credits
 * only (26 Oct 2026): 1 per second for Speed, 2 for Precision, per language (plans.ts).
 */
const QUALITY: Array<{ key: TranslationQuality; title: string; text: string }> = [
  { key: "speed", title: "Speed", text: "Fast. Best for one person facing the camera." },
  { key: "precision", title: "Precision", text: "Most real lip sync. For movement and side angles; twice as long." },
];

/**
 * The "Translate an existing video" form: three numbered blocks (video, languages and quality,
 * captions and format) and a fixed summary that holds the rights confirmation and the button.
 * Demo: simulated project; database: upload + real workflow. What it sends is built by
 * buildTranslateDraft and covered by src/lib/forms/forms.test.ts.
 */
type TranslateFormProps = { fromAd?: AdProject; /** "Add a language" (31 Oct 2026): an earlier translation's upload is the source; the rights box is asked again. */ fromTranslation?: TranslateProject; /** `?speaker=presenter` opens the AI presenter flow. */ initialSpeaker?: "original" | "presenter" };

/**
 * The form starts empty after every start (28 Oct 2026, Tijs): the app keeps pages alive between
 * navigations, so "Translate another" used to bring back the last video and choices. A new key after
 * each start gives a fresh form, so the next video can be started at once while the first one runs.
 */
export function TranslateForm(props: TranslateFormProps = {}) {
  const [round, setRound] = useState(0);
  return <TranslateFormFields key={round} {...props} onStarted={() => setRound((r) => r + 1)} />;
}

/** What the form remembers between visits (2 Nov 2026, src/lib/forms/formDraft.ts): every choice and the staged video; never the rights tick. */
type TranslateDraftData = {
  projectName: string;
  source: LanguageCode | "auto";
  targets: LanguageCode[];
  quality: TranslationQuality;
  keepTerms: string;
  replaceRows: { from: string; to: string }[];
  instructions: string;
  format: "original" | "9:16";
  enhance: boolean;
  trimSilence: boolean;
  captionPosition: "low" | "middle";
  captionStyle: CaptionStyleChoice;
  removeMusic: boolean;
  cleanVoice: boolean;
  removeText: boolean;
  speaker: "original" | "presenter";
  presenterSetup: PresenterTranslate;
  staged: StagedUpload | null;
};
const DRAFT_FORM = "translate";

function TranslateFormFields({ fromAd, fromTranslation, initialSpeaker = "original", onStarted }: TranslateFormProps & { onStarted: () => void }) {
  const router = useRouter();
  const draftScope = useDraftScope();
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  // The picked video goes to storage at once (2 Nov 2026): a refresh keeps it, and the start needs no second upload.
  const [staged, setStaged] = useState<StagedUpload | null>(null);
  const [stagingPct, setStagingPct] = useState<number | null>(null);
  const stagingFor = useRef<File | null>(null);
  /** Set when the form came back from a draft, with the moment it was saved. */
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(fromAd ? `${fromAd.name} — translation` : fromTranslation ? `${fromTranslation.name} — more languages` : "");
  // The name comes from the file (31 Oct 2026) unless the customer typed one; the field sits under a fold.
  const autoName = useRef<string | null>(null);
  // Block 3 (format, captions, sound) is folded: the defaults are right for most videos; "Change" opens it.
  const [styleOpen, setStyleOpen] = useState(false);
  const [source, setSource] = useState<LanguageCode | "auto">(fromAd?.language && isTranslateLanguage(fromAd.language) ? fromAd.language : fromTranslation ? fromTranslation.sourceLanguage : "auto");
  // The presenter flow speaks one language with presenter voices; start on English.
  const [targets, setTargets] = useState<LanguageCode[]>(initialSpeaker === "presenter" ? ["en"] : []);
  const [quality, setQuality] = useState<TranslationQuality>("speed");
  // A localized ad was generated by the customer here: the rights are recorded without a checkbox.
  const [rights, setRights] = useState(Boolean(fromAd));
  // A stored video as the source: the finished ad, or the upload of the earlier translation.
  const sourceAd = fromAd ? { id: fromAd.id, seconds: fromAd.seconds ?? 30 } : fromTranslation ? { id: fromTranslation.id, seconds: fromTranslation.sourceSeconds } : undefined;
  const [keepTerms, setKeepTerms] = useState("");
  // "Say Y instead of X" and free wishes for the wording (27 Oct 2026).
  const [replaceRows, setReplaceRows] = useState<{ from: string; to: string }[]>([{ from: "", to: "" }]);
  const [instructions, setInstructions] = useState("");
  const [format, setFormat] = useState<"original" | "9:16">("9:16");
  const [enhance, setEnhance] = useState(false);
  // Off by default (29 Oct 2026, Tijs): a silent product shot at the start is part of the video.
  const [trimSilence, setTrimSilence] = useState(false);
  const [captionPosition, setCaptionPosition] = useState<"low" | "middle">("low");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleChoice>(DEFAULT_CAPTION_STYLE);
  const [removeMusic, setRemoveMusic] = useState(false);
  const [cleanVoice, setCleanVoice] = useState(false);
  const [removeText, setRemoveText] = useState(false);
  // Who speaks the translation (26 Oct 2026): the original speaker, lip-synced, or an AI presenter.
  const [speaker, setSpeaker] = useState<"original" | "presenter">(initialSpeaker);
  const [presenterSetup, setPresenterSetup] = useState<PresenterTranslate>(DEFAULT_PRESENTER_TRANSLATE);
  const withPresenter = speaker === "presenter";
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  /** 0–100 while the video is on its way to storage (27 Oct 2026); null before and after. */
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  /** Second step of the submit: the form is valid and the customer sees the cost once more before anything starts. */
  const [confirming, setConfirming] = useState(false);
  const submitLock = useRef(false);
  // Before React is attached a click must not submit the form natively (that would reload the page with
  // nothing saved): the visible buttons are type="button" and call requestSubmit(), and a hidden disabled
  // submit button first in the form blocks implicit submission on Enter. So the button can stay readable.
  const formRef = useRef<HTMLFormElement>(null);

  const seconds = sourceAd?.seconds ?? video?.seconds ?? staged?.seconds ?? 30;
  // Internal only (never shown): the spending limit per language version decides what can start.
  const budget = Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) > 0 ? Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) : 2;
  const estimateFor = (q: TranslationQuality, enh = enhance) =>
    estimateTranslateCost({ seconds, quality: q, enhance: enh, removeText, presenterEngine: withPresenter ? presenterSetup.engine : undefined, languages: Math.max(1, targets.length), hasSourceTranscript: sourceTranscriptEnabled() && source !== "auto" });
  const estimate = estimateFor(quality);
  const overBudget = estimate.perLanguageTotal > budget;
  const [balance, setBalance] = useState<number | null>(null);
  const [planKey, setPlanKey] = useState<string | null>(null);
  // What the plan unlocks (26 Oct 2026): Precision from Pro, enhancement from Scale. Demo mode and the
  // moment before the plan is known lock nothing; the server checks again.
  const can = (feature: PlanFeature) => config.demoMode || planKey === null || hasFeature(planKey, feature);
  // The last translation's choices (31 Oct 2026), read after mount so the server HTML stays the same:
  // a fresh upload form starts with the languages, quality, format and caption look of the previous one.
  const [recalled, setRecalled] = useState<LastChoices | null>(null);
  const freshUpload = !fromAd && !fromTranslation && initialSpeaker === "original";
  const draftable = !fromAd && !fromTranslation;
  useEffect(() => {
    if (!draftable) return;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      // A draft of this user in this workspace comes first (2 Nov 2026); otherwise the last choices.
      const draft = readScopedDraft<TranslateDraftData>(DRAFT_FORM, draftScope);
      if (draft) {
        const d = draft.data;
        setProjectName(d.projectName ?? "");
        setSource(d.source ?? "auto");
        setTargets(Array.isArray(d.targets) ? d.targets.filter(isTranslateLanguage) : []);
        setQuality(d.quality === "precision" ? "precision" : "speed");
        setKeepTerms(d.keepTerms ?? "");
        setReplaceRows(Array.isArray(d.replaceRows) && d.replaceRows.length ? d.replaceRows : [{ from: "", to: "" }]);
        setInstructions(d.instructions ?? "");
        setFormat(d.format === "original" ? "original" : "9:16");
        setEnhance(Boolean(d.enhance));
        setTrimSilence(Boolean(d.trimSilence));
        setCaptionPosition(d.captionPosition === "middle" ? "middle" : "low");
        setCaptionStyle(d.captionStyle ?? DEFAULT_CAPTION_STYLE);
        setRemoveMusic(Boolean(d.removeMusic));
        setCleanVoice(Boolean(d.cleanVoice));
        setRemoveText(Boolean(d.removeText));
        setSpeaker(d.speaker === "presenter" ? "presenter" : "original");
        if (d.presenterSetup) setPresenterSetup(d.presenterSetup);
        if (d.staged?.path && d.staged.fileName) setStaged(d.staged);
        setRestoredAt(draft.savedAt);
        return;
      }
      if (!freshUpload) return;
      const last = readLastChoices();
      if (!last) return;
      setRecalled(last);
      setTargets(last.targets);
      setQuality(last.quality);
      setFormat(last.format);
      setCaptionPosition(last.captionPosition);
      setCaptionStyle(last.captionStyle);
      setRemoveMusic(last.removeMusic);
      setCleanVoice(last.cleanVoice);
    });
    return () => {
      alive = false;
    };
  }, [freshUpload, draftable, draftScope]);
  // Every change lands in the draft a moment later, until the video starts (the draft is cleared then).
  const draftData: TranslateDraftData = { projectName, source, targets, quality, keepTerms, replaceRows, instructions, format, enhance, trimSilence, captionPosition, captionStyle, removeMusic, cleanVoice, removeText, speaker, presenterSetup, staged };
  useDraftSaver(DRAFT_FORM, draftData, draftable && !submitting);
  /** "Start over": the draft and the staged video go, the form comes back empty. */
  function discardDraft() {
    clearScopedDraft(DRAFT_FORM, draftScope);
    if (staged) void discardStaged(staged.path);
    onStarted();
  }
  /** The picked file goes to storage straight away; a failure is silent here (the start uploads it then). */
  async function stage(file: File) {
    stagingFor.current = file;
    setStagingPct(0);
    try {
      const result = await stageUpload("source", file, (f) => stagingFor.current === file && setStagingPct(Math.round(f * 100)));
      if (stagingFor.current !== file) {
        if (result) void discardStaged(result.path);
        return;
      }
      setStaged(result ? { ...result, seconds: video?.seconds } : null);
    } catch {
      if (stagingFor.current === file) setStaged(null);
    } finally {
      if (stagingFor.current === file) setStagingPct(null);
    }
  }
  function resetChoices() {
    setRecalled(null);
    setTargets([]);
    setQuality("speed");
    setFormat("9:16");
    setCaptionPosition("low");
    setCaptionStyle(DEFAULT_CAPTION_STYLE);
    setRemoveMusic(false);
    setCleanVoice(false);
  }
  useEffect(() => {
    if (config.demoMode) return;
    let alive = true;
    getAccountStatus()
      .then((a) => {
        if (!alive) return;
        setBalance(a.balance);
        setPlanKey(a.planKey);
        // Choices this plan does not include fall back to what it does.
        if (!hasFeature(a.planKey, "precision")) setQuality("speed");
        if (!hasFeature(a.planKey, "enhance")) setEnhance(false);
        if (!hasFeature(a.planKey, "removeText")) setRemoveText(false);
        if (!hasFeature(a.planKey, "aiPresenter")) setSpeaker("original");
        if (!hasFeature(a.planKey, "premium")) setPresenterSetup((p) => ({ ...p, engine: "avatar_iii" }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function toggleTarget(code: LanguageCode) {
    if (code === source) {
      setErrors((e) => ({ ...e, targets: `${languageOf(code).label} is the spoken language of the video; pick a different language to translate into.` }));
      return;
    }
    setTargets((t) => (t.includes(code) ? t.filter((c) => c !== code) : [...t, code]));
    if (errors.targets) setErrors((e) => ({ ...e, targets: undefined }));
  }

  // One option per language and regional variant; most-used languages first, then the rest alphabetically.
  const made = new Set<string>(fromTranslation?.targetLanguages ?? []);
  const languageOptions: SelectOption[] = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.label,
    group: TOP_LANGUAGES.includes(l.base) ? "Most used" : "All languages",
    disabled: l.code === source || made.has(l.code),
    disabledReason: made.has(l.code) ? `Already made in “${fromTranslation?.name}”` : "This is the spoken language of the video",
  }));
  const sourceOptions: SelectOption[] = [{ value: "auto", label: "Detect automatically", group: "Recommended" }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label, group: TOP_LANGUAGES.includes(l.base) ? "Most used" : "All languages" }))];

  // The file in memory, the staged copy, or both (after a refresh only the copy is left).
  const videoState = video ? { file: video.file, seconds: video.seconds ?? staged?.seconds, staged: staged ?? undefined } : staged ? { seconds: staged.seconds, staged } : undefined;
  const formState = { video: videoState, sourceAd, rightsRequired: !fromAd, projectName, source, targets, quality, rights, keepTerms, format, enhance, trimSilence, captionPosition, captionStyle, removeMusic: withPresenter ? false : removeMusic, cleanVoice: withPresenter ? false : cleanVoice, removeText, replaceTerms: replaceRows, instructions, speaker, presenter: withPresenter ? presenterSetup : undefined };

  function validate(): Errors {
    return validateTranslateForm(formState);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      setConfirming(false);
      return;
    }
    if (!videoState && !sourceAd) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const { id } = await createTranslateProject(sourceAd ? buildTranslateDraft({ ...formState, sourceAd }) : buildTranslateDraft({ ...formState, video: videoState! }), (f) => setUploadPct(Math.round(f * 100)));
      if (!withPresenter) writeLastChoices({ targets, quality, format, captionPosition, captionStyle, removeMusic, cleanVoice });
      clearScopedDraft(DRAFT_FORM, draftScope);
      router.push(`/projects/${id}`);
      onStarted();
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      setUploadPct(null);
      setConfirming(false);
      setErrors({ form: error instanceof Error ? error.message : "Something went wrong while starting the translation. Please try again." });
    }
  }

  const qualityTitle = QUALITY.find((q) => q.key === quality)?.title ?? "Speed";
  const creditsPerLanguage = translateCredits({ seconds, quality, enhance, removeText, presenterEngine: withPresenter ? presenterSetup.engine : undefined, languages: Math.max(1, targets.length), hasSourceTranscript: sourceTranscriptEnabled() && source !== "auto" });
  const languageCount = Math.max(1, targets.length);
  const totalCredits = creditsPerLanguage * languageCount;
  const shortOfCredits = balance !== null && balance < totalCredits;
  const knownLength = Boolean(sourceAd || video || staged);
  const staging = stagingPct !== null;
  // Short and calm (28 Oct 2026): what was picked in a word or two; the extras on one line.
  const extras = [removeText && "Text removed", cleanReplace(replaceRows).length > 0 && "Words replaced", removeMusic && "No music", cleanVoice && "Clean voice", enhance && "Enhanced"].filter(Boolean) as string[];
  // The one line on the folded block 3: what the defaults are, or what was changed.
  const captionsOn = captionStyle.show || (removeText && !withPresenter);
  const styleSummary = [
    withPresenter ? null : format === "9:16" ? "Vertical 9:16" : "Original size",
    captionsOn ? `captions ${captionStyle.highlight === "none" ? "plain" : `with a ${captionStyle.highlight === "box" ? "box" : captionStyle.highlight} on the spoken word`}` : "no captions",
    withPresenter ? null : [removeMusic && "music removed", cleanVoice && "voice cleaned", enhance && "picture enhanced", trimSilence && "silence removed"].filter(Boolean).join(", ") || "sound as it is",
  ].filter(Boolean).join(" · ");
  const summaryRows = [
    { label: "Video", value: sourceAd ? formatDuration(Math.round(seconds)) : video || staged ? formatDuration(Math.round(seconds)) : "Not added", muted: !video && !staged && !sourceAd },
    { label: "Into", value: targets.length === 0 ? "Pick a language" : targets.map((t) => languageOf(t).tag).join(", "), muted: targets.length === 0 },
    withPresenter ? { label: "Speaker", value: presenterSetup.engine === "avatar_iv" ? "Presenter · Premium" : "Presenter" } : { label: "Quality", value: qualityTitle },
    { label: "Format", value: format === "9:16" ? "9:16" : "Original" },
    { label: "Captions", value: captionStyle.show || (removeText && !withPresenter) ? "On" : "Off" },
    ...(extras.length ? [{ label: "Extras", value: extras.join(" · ") }] : []),
  ];

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-8 pb-28 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:pb-0">
      <button type="submit" disabled tabIndex={-1} aria-hidden className="hidden" />
      <div className="min-w-0 space-y-6">
        <ServiceStatusBanner />

        {/* 1. The video */}
        <SectionCard number={1} title={fromAd ? "Your ad" : "Your video"} description={fromAd ? "The finished ad is the source: nothing to upload." : fromTranslation ? "The same video, already stored: nothing to upload." : "One speaker, clear audio."}>
          {fromTranslation ? (
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
              {fromTranslation.sourceVideoUrl && <VideoPlayer src={fromTranslation.sourceVideoUrl} simulated={config.demoMode} className="mx-auto w-full max-w-[160px] sm:mx-0" />}
              <div className="space-y-2 text-sm">
                <p className="font-medium text-ink">{fromTranslation.name}</p>
                <p className="text-muted">{formatDuration(Math.round(seconds))} · uploaded {formatDate(fromTranslation.createdAt)}</p>
                <p className="text-muted">Already made: {fromTranslation.targetLanguages.map((c) => languageOf(c).label).join(", ")}.</p>
              </div>
            </div>
          ) : fromAd ? (
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
              <VideoPlayer src={fromAd.finalVideoUrl!} poster={fromAd.imageUrls[0]} simulated={config.demoMode} className="mx-auto w-full max-w-[160px] sm:mx-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-ink">{fromAd.name}</p>
                <p className="text-muted">{fromAd.productName} · {formatDuration(Math.round(seconds))} · generated {formatDate(fromAd.createdAt)}</p>
                <p className="flex items-start gap-2 rounded-[10px] bg-success/10 p-3 text-[13px] leading-relaxed text-ink/80">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  Rights: generated by you in Clipelle. This is stored with the translation; no confirmation box is needed.
                </p>
              </div>
            </div>
          ) : (
          <Field id="video" label="Video" error={errors.video}>
            {!video && staged ? (
              <div className="flex items-center gap-4 rounded-[14px] bg-surface-muted p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-ink text-surface" aria-hidden><FileVideo className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">{staged.fileName}</p>
                  <p className="text-[13px] text-muted">{staged.seconds ? `${formatDuration(staged.seconds)} · ` : ""}Already uploaded, kept from your last visit.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={() => { void discardStaged(staged.path); setStaged(null); }}>Remove</Button>
              </div>
            ) : (
            <VideoDropzone
              id="video"
              video={video}
              onChange={(v) => {
                setVideo(v);
                if (v && errors.video) setErrors((e) => ({ ...e, video: undefined }));
                if (v && v.file !== stagingFor.current) {
                  if (staged) void discardStaged(staged.path);
                  setStaged(null);
                  void stage(v.file);
                } else if (v && staged && v.seconds !== undefined && staged.seconds !== v.seconds) setStaged({ ...staged, seconds: v.seconds });
                if (!v) {
                  stagingFor.current = null;
                  setStagingPct(null);
                  if (staged) void discardStaged(staged.path);
                  setStaged(null);
                }
                if (v && (projectName.trim() === "" || projectName === autoName.current)) {
                  autoName.current = projectNameFromFile(v.file.name);
                  setProjectName(autoName.current);
                  if (errors.projectName) setErrors((er) => ({ ...er, projectName: undefined }));
                }
              }}
              maxSizeMb={config.limits.translateVideoMaxMb}
              maxSeconds={config.limits.translateVideoMaxSeconds}
              onReject={(message) => setErrors((e) => ({ ...e, video: message }))}
              invalid={Boolean(errors.video)}
              disabled={submitting}
            />
            )}
            {staging && (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-muted" role="status"><Loader2 className="size-3.5 animate-spin" aria-hidden />Uploading {stagingPct}% — you can keep filling in the form.</p>
            )}
            {restoredAt && !submitting && (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted" role="status">
                <span>Picked up where you left off.</span>
                <button type="button" onClick={discardDraft} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Start over</button>
              </p>
            )}
          </Field>
          )}
          <label htmlFor="removeText" className={cn("flex items-start gap-3 rounded-panel border p-4 transition-colors duration-150", can("removeText") ? "cursor-pointer" : "cursor-not-allowed opacity-70", removeText ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30")}>
            <input id="removeText" type="checkbox" checked={removeText} onChange={(e) => setRemoveText(e.target.checked)} disabled={submitting || !can("removeText")} className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                Remove on-screen text
                {!can("removeText") && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-surface"><Lock className="size-3" aria-hidden />{FEATURE_PLAN.removeText}</span>}
              </span>
              <span className="block text-[13px] leading-relaxed text-muted">Old captions, titles and stickers are painted out; your new captions go where they were. +{CREDIT_RULES.translate.removeText} credit per second per language.</span>
            </span>
          </label>
          <Field id="projectName" label="Project name" error={errors.projectName}>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (errors.projectName) setErrors((er) => ({ ...er, projectName: undefined }));
              }}
              placeholder="e.g. Founder story — DE + FR"
              invalid={Boolean(errors.projectName)}
              disabled={submitting}
              autoComplete="off"
            />
          </Field>
        </SectionCard>

        {/* 2. Languages and quality */}
        <SectionCard number={2} title={withPresenter ? "Language and presenter" : "Languages and quality"} description={withPresenter ? "The lines are translated and checked, then the presenter you pick speaks them." : "Pick the languages. Every line is checked against the original before the render."}>
          {/* Who speaks (31 Oct 2026): one pill row instead of two cards; the one line under it says what the choice means. */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Who speaks the translation?</legend>
            <SegmentedControl
              label="Who speaks the translation"
              options={[
                { key: "original", label: "Their own voice" },
                { key: "presenter", label: can("aiPresenter") ? "An AI presenter" : <span className="inline-flex items-center gap-1.5">An AI presenter <Lock className="size-3" aria-hidden /></span>, disabled: !can("aiPresenter") },
              ]}
              value={speaker}
              onChange={(k) => {
                if (k === "original") {
                  setSpeaker("original");
                  return;
                }
                setSpeaker("presenter");
                setQuality("speed");
                setTargets((t) => {
                  const ok = t.find((c) => (PRESENTER_LANGUAGES as string[]).includes(c));
                  return ok ? [ok] : [PRESENTER_LANGUAGES.find((c) => c !== source) ?? "en"];
                });
              }}
              disabled={submitting}
            />
            <p className="text-[13px] text-muted">{withPresenter ? "Another face, voice and accent speaks the checked translation." : "Their own voice, lips matched. Several languages at once."}</p>
            {!can("aiPresenter") && <PlanHint feature="aiPresenter" text={`The AI presenter comes with ${FEATURE_PLAN.aiPresenter} and up.`} />}
          </fieldset>

          <Field id="source" label="Spoken language">
            <SearchableSelect
              id="source"
              value={source}
              options={sourceOptions}
              onChange={(value) => {
                setSource(value as LanguageCode | "auto");
                if (value !== "auto") setTargets((t) => t.filter((c) => c !== value));
              }}
              disabled={submitting}
            />
          </Field>

          {withPresenter ? (
            <>
              <Field id="targets" label="Translate into" hint="One language per video; these have presenter voices." error={errors.targets}>
                <select
                  id="targets"
                  value={targets[0] ?? ""}
                  onChange={(e) => setTargets([e.target.value as LanguageCode])}
                  disabled={submitting}
                  className={cn(controlClass, controlStateClass(Boolean(errors.targets)), "h-11")}
                >
                  {PRESENTER_LANGUAGES.filter((c) => c !== source).map((c) => (
                    <option key={c} value={c}>{AD_LANGUAGES[c].label}</option>
                  ))}
                </select>
              </Field>
              <PresenterSetup
                value={presenterSetup}
                onChange={setPresenterSetup}
                language={(PRESENTER_LANGUAGES as string[]).includes(targets[0] ?? "") ? (targets[0] as AdLanguageCode) : "en"}
                creditsFor={(engine) => translateCredits({ seconds, quality: "speed", enhance: false, removeText, presenterEngine: engine })}
                canPremium={can("premium")}
                disabled={submitting}
              />
            </>
          ) : (
            <>
          <Field id="targets" label="Translate into" hint="One or more. For an accent, pick the regional version." error={errors.targets}>
                <SearchableSelect id="targets" multiple values={targets} options={languageOptions} onToggle={toggleTarget} placeholder="Search a language…" disabled={submitting} invalid={Boolean(errors.targets)} />
              </Field>
              {recalled && (
                <p className="fold-in flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted" role="status">
                  <span>Last time: <span className="text-ink">{lastChoicesSummary(recalled, (c) => languageOf(c).tag)}</span></span>
                  <button type="button" onClick={resetChoices} disabled={submitting} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Start from the defaults</button>
                </p>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">Quality</legend>
                <OptionGrid columns={2}>
                  {QUALITY.map((q) => {
                    const perLanguage = translateCredits({ seconds, quality: q.key, enhance, removeText });
                    return (
                      <OptionCard
                        key={q.key}
                        selected={quality === q.key}
                        onSelect={() => setQuality(q.key)}
                        disabled={submitting}
                        lockedTo={q.key === "precision" && !can("precision") ? FEATURE_PLAN.precision : undefined}
                        title={q.title}
                        badge={q.key === "speed" ? <Badge tone="success">Recommended</Badge> : undefined}
                        meta={<span className="label-mono text-muted">{perLanguage} credits</span>}
                        description={q.text}
                      />
                    );
                  })}
                </OptionGrid>
                {!can("precision") && <PlanHint feature="precision" text="Precision comes with Pro and up." />}
                <p className="text-[13px] text-muted">Per language{knownLength ? `, for your ${Math.round(seconds)} s video` : ", for 30 s until you add your video"}. Check, lip sync and captions included.</p>
              </fieldset>
            </>
          )}

          {/* Visible since 25 Oct 2026 (was under Advanced): names and special terms are where machine translation slips most. */}
          <Field id="keepTerms" label="Words to keep as they are" optional hint="Brand and product names stay exactly as written. Comma-separated, up to 20.">
            <Input id="keepTerms" value={keepTerms} maxLength={600} onChange={(e) => setKeepTerms(e.target.value)} placeholder="e.g. your brand name, product names" disabled={submitting} />
          </Field>

          {/* Less used (27 Oct 2026): folded, so the form reads short. */}
          <Disclosure title="Change the wording" summary={[cleanReplace(replaceRows).length ? `${cleanReplace(replaceRows).length} ${cleanReplace(replaceRows).length === 1 ? "word" : "words"} replaced` : null, instructions.trim() ? "instructions added" : null].filter(Boolean).join(" · ") || "Replace words, or ask for a change"}>
          <fieldset className="space-y-2">
            <legend className="flex w-full items-center justify-between text-sm font-medium text-ink">Words to replace <span className="label-mono text-muted">Optional</span></legend>
            <p className="text-[13px] text-muted">Say something else than the video does. Write it once; it is said in each language you picked, names stay as written.</p>
            <div className="space-y-2">
              {replaceRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
                  <Input aria-label={`Word ${i + 1} in the video`} value={row.from} maxLength={60} onChange={(e) => setReplaceRows((rows) => rows.map((r, j) => (j === i ? { ...r, from: e.target.value } : r)))} placeholder="In the video, e.g. GlowCo" disabled={submitting} />
                  <ArrowRight className="size-4 text-muted" aria-hidden />
                  <Input aria-label={`Word ${i + 1} to say instead`} value={row.to} maxLength={60} onChange={(e) => setReplaceRows((rows) => rows.map((r, j) => (j === i ? { ...r, to: e.target.value } : r)))} placeholder="Say instead, e.g. your brand" disabled={submitting} />
                  <button type="button" onClick={() => setReplaceRows((rows) => (rows.length === 1 ? [{ from: "", to: "" }] : rows.filter((_, j) => j !== i)))} disabled={submitting} aria-label={`Remove word ${i + 1}`} className="focus-ring grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            {replaceRows.length < 10 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setReplaceRows((rows) => [...rows, { from: "", to: "" }])} disabled={submitting}>
                <Plus className="size-4" aria-hidden />Add a word
              </Button>
            )}
          </fieldset>

          <Field id="instructions" label="Anything to change?" optional hint="Plain words, up to 300 characters. A line changes only where it still fits its moment.">
            <Textarea id="instructions" value={instructions} maxLength={300} rows={2} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Leave out the sentence about free shipping." disabled={submitting} />
          </Field>
          </Disclosure>
        </SectionCard>

        {/* 3. Captions and format: folded (31 Oct 2026), the defaults fit most videos; the summary line says what they are. */}
        <SectionCard
          number={3}
          title="Captions, format and sound"
          description={styleSummary}
          aside={
            <Button type="button" variant="secondary" size="sm" onClick={() => setStyleOpen((o) => !o)} aria-expanded={styleOpen} aria-controls="style-options" disabled={submitting}>
              {styleOpen ? "Done" : "Change"}
            </Button>
          }
          contentClassName={cn(!styleOpen && "hidden")}
        >
          <div id="style-options" className="space-y-6 fold-in">
          {!withPresenter && (<fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Format</legend>
            <OptionGrid columns={2}>
              {(
                [
                  { key: "9:16", title: "Vertical 9:16", text: "For TikTok, Reels and Shorts; the sides are cropped.", recommended: true },
                  { key: "original", title: "Keep original", text: "The same size as your upload.", recommended: false },
                ] as const
              ).map((f) => (
                <OptionCard
                  key={f.key}
                  selected={format === f.key}
                  onSelect={() => setFormat(f.key)}
                  disabled={submitting}
                  title={f.title}
                  badge={f.recommended ? <Badge tone="success">Recommended</Badge> : undefined}
                  description={f.text}
                />
              ))}
            </OptionGrid>
          </fieldset>)}

          <CaptionStylePicker value={captionStyle} onChange={setCaptionStyle} position={captionPosition} onPosition={setCaptionPosition} overOldText={removeText && !withPresenter} disabled={submitting} />

          {!withPresenter && (<fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Sound</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckCard id="removeMusic" checked={removeMusic} onChange={setRemoveMusic} disabled={submitting} title="Remove background music" text="Only the translated voice stays." />
              <CheckCard id="cleanVoice" checked={cleanVoice} onChange={setCleanVoice} disabled={submitting} title="Clean up the voice" text="Less echo and background noise." />
            </div>
          </fieldset>)}

          {!withPresenter && (<Disclosure title="Advanced" summary={`${trimSilence ? "Silence removed" : "Silence kept"} · ${enhance ? "enhancement on" : "no enhancement"}`}>
            <label htmlFor="trimSilence" className={cn("flex cursor-pointer items-start gap-3 rounded-panel border p-4 transition-colors duration-150", trimSilence ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30")}>
              <input id="trimSilence" type="checkbox" checked={trimSilence} onChange={(e) => setTrimSilence(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-ink">Remove silence at start and end</span>
                <span className="block text-[13px] leading-relaxed text-muted">Quiet stretches before the first and after the last line are cut.</span>
              </span>
            </label>
            <label htmlFor="enhance" className={cn("flex items-start gap-3 rounded-panel border p-4 transition-colors duration-150", can("enhance") ? "cursor-pointer" : "cursor-not-allowed opacity-70", enhance ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30")}>
              <input id="enhance" type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} disabled={submitting || !can("enhance")} className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">Enhance picture quality{!can("enhance") && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-surface"><Lock className="size-3" aria-hidden />{FEATURE_PLAN.enhance}</span>}</span>
                <span className="block text-[13px] leading-relaxed text-muted">Sharper picture before the captions. +{CREDIT_RULES.translate.enhance} credit per second per language.</span>
              </span>
            </label>
          </Disclosure>)}
          </div>
        </SectionCard>
      </div>

      {/* The fixed summary: choices, credits, the rights confirmation and the button */}
      <SummaryPanel
        rows={summaryRows}
        total={{
          label: targets.length > 1 ? `Credits · ${targets.length} languages` : "Credits",
          value: `${totalCredits}`,
          tone: overBudget || shortOfCredits ? "danger" : "neutral",
          note: [
            targets.length > 1 ? `${creditsPerLanguage} per language.` : null,
            balance !== null ? (shortOfCredits ? `${(totalCredits - balance).toLocaleString("en-US")} short.` : `${(balance - totalCredits).toLocaleString("en-US")} left after this.`) : null,
          ].filter(Boolean).join(" ") || undefined,
        }}
        footnote={config.demoMode ? "Demo mode: a simulated run." : "You only pay for the languages that are delivered."}
      >
        {overBudget && (
          <p role="status" className="rounded-chip bg-danger/10 p-3 text-[13px] font-medium leading-relaxed text-danger">
            This combination is not available for a video this long yet. Choose Speed, turn off enhancement, or use a shorter video.
          </p>
        )}
        {shortOfCredits && !overBudget && (
          <p role="status" className="rounded-chip bg-danger/10 p-3 text-[13px] font-medium leading-relaxed text-danger">
            This needs {totalCredits} credits and you have {balance}. <a href="/settings/billing" className="underline underline-offset-2">Add credits</a>, pick fewer languages or use a shorter video.
          </p>
        )}
        {fromAd ? (
          <p id="rights-note" className="flex items-start gap-2 rounded-panel border border-success/40 bg-success/5 p-3.5 text-[13px] leading-relaxed text-ink">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Rights recorded as generated by you in Clipelle.
          </p>
        ) : (
        <label
          htmlFor="rights"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-panel border p-3.5 transition-colors duration-150",
            errors.rights ? "border-danger bg-danger/5" : rights ? "border-success/40 bg-success/5" : "border-border bg-surface hover:border-ink/30",
          )}
        >
          <input
            id="rights"
            type="checkbox"
            checked={rights}
            onChange={(e) => {
              setRights(e.target.checked);
              if (e.target.checked && errors.rights) setErrors((er) => ({ ...er, rights: undefined }));
            }}
            disabled={submitting}
            aria-describedby={errors.rights ? "rights-error" : "rights-note"}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="text-[13px] leading-relaxed text-ink">{config.rightsConfirmationText}</span>
        </label>
        )}
        {fromAd ? null : errors.rights ? (
          <p id="rights-error" role="alert" className="text-[13px] text-danger">
            {errors.rights}
          </p>
        ) : (
          <p id="rights-note" className="sr-only">The voice and face in this video are cloned for the translation, so we need your confirmation first.</p>
        )}
        {confirming ? (
          <div className="fold-in rounded-panel border border-ink bg-surface p-4" role="group" aria-labelledby="confirm-title">
            <p id="confirm-title" className="text-[15px] font-semibold text-ink">Start this translation?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {Math.round(seconds)} s of video · {qualityTitle} · {targets.length} {targets.length === 1 ? "language" : "languages"} ({targets.map((t) => languageOf(t).label).join(", ")}) · {format === "9:16" ? "9:16" : "original size"} with captions.
              {" "}Uses <span className="font-medium text-ink">{totalCredits} credits</span>{targets.length > 1 ? ` (${creditsPerLanguage} per language)` : ""}.
              {config.demoMode ? " Demo mode: nothing is charged, the run is simulated." : " A language that fails costs nothing."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" variant="accent" size="lg" className="w-full" onClick={() => formRef.current?.requestSubmit()} disabled={submitting || staging || !rights || overBudget || shortOfCredits}>
                {submitting || staging ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
                {staging ? `Uploading ${stagingPct}%` : submitting ? (uploadPct !== null && uploadPct < 100 ? `Uploading ${uploadPct}%` : "Starting…") : `Start now · ${totalCredits} credits`}
              </Button>
              {submitting && uploadPct !== null && (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadPct} aria-label="Upload">
                  <div className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-300" style={{ transform: `scaleX(${uploadPct / 100})` }} />
                </div>
              )}
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button type="button" variant="accent" size="lg" className="w-full" onClick={() => formRef.current?.requestSubmit()} disabled={submitting || staging || !rights || overBudget || shortOfCredits}>
              {staging ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
              {staging ? `Uploading ${stagingPct}%` : `Start translation · ${totalCredits} credits`}
            </Button>
            <Button href="/new" variant="ghost" className={cn("w-full", submitting && "pointer-events-none opacity-50")} aria-disabled={submitting || undefined}>
              Back
            </Button>
          </>
        )}
        {errors.form && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.form}
          </p>
        )}
      </SummaryPanel>

      {/* Phones and tablets (27 Oct 2026): the credits and the button stay in view; a missing rights tick scrolls to the box. */}
      <MobileActionBar>
        {confirming && (
          <p className="mb-2 text-[12.5px] leading-snug text-muted">
            {Math.round(seconds)} s · {targets.length} {targets.length === 1 ? "language" : "languages"} · {totalCredits} credits{balance !== null && !shortOfCredits ? ` · ${(balance - totalCredits).toLocaleString("en-US")} left after this` : ""}. {config.demoMode ? "Demo: nothing is charged." : "A language that fails costs nothing."}
          </p>
        )}
        <div className="flex items-center gap-3">
          {confirming ? (
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>Back</Button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">{targets.length > 1 ? `Credits · ${targets.length} languages` : "Credits"}</p>
              <p className={cn("text-[20px] font-semibold leading-none tracking-[-0.02em]", overBudget || shortOfCredits ? "text-danger" : "text-ink")}>{totalCredits}</p>
            </div>
          )}
          <Button type="button" variant="accent" size="lg" className={cn("shrink-0", confirming && "flex-1")} onClick={() => formRef.current?.requestSubmit()} disabled={submitting || staging || overBudget || shortOfCredits}>
            {submitting || staging ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
            {staging ? `Uploading ${stagingPct}%` : submitting ? (uploadPct !== null && uploadPct < 100 ? `Uploading ${uploadPct}%` : "Starting…") : confirming ? "Start now" : "Start translation"}
          </Button>
        </div>
        {submitting && uploadPct !== null && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            <div className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-300" style={{ transform: `scaleX(${uploadPct / 100})` }} />
          </div>
        )}
      </MobileActionBar>
    </form>
  );
}

/** A checkbox as a bordered card (sound options). */
function CheckCard({ id, checked, onChange, disabled, title, text }: { id: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; text: string }) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 rounded-panel border p-4 transition-colors duration-150", checked ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30")}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-[13px] leading-relaxed text-muted">{text}</span>
      </span>
    </label>
  );
}
