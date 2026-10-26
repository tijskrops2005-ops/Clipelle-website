/**
 * Status of one pipeline step.
 * "needs_input" means the step waits for the user (e.g. reviewing a translation).
 */
export type StepStatus = "waiting" | "processing" | "completed" | "failed" | "needs_input";

/** Overall status of a project. "review" = paused until the user checks something. */
export type ProjectStatus = "draft" | "processing" | "review" | "completed" | "failed";

/** The two workflows the app runs. */
export type WorkflowKind = "ad" | "translate";

/**
 * Steps of the ad workflow, named after what they do, not after the provider
 * (the customer-facing label per step is in config.stepLabels; the provider behind it is internal and swappable).
 */
export type StepKey = "script" | "productClip" | "presenter" | "finalEdit";

/** Steps of the translate workflow. */
export type TranslateStepKey = "upload" | "translate" | "captions";

export interface Step {
  status: StepStatus;
  startedAt?: string; // ISO date
  finishedAt?: string; // ISO date
  /** Plain-language error shown to the user when status is "failed". */
  error?: string;
  /** Plain-language note on a completed step that needs a look (e.g. the script was cut to fit). */
  warning?: string;
  /** URL of this step's output (clip, presenter video, final edit). */
  outputUrl?: string;
  /** Job id at the external service — needed for polling / retries later. */
  externalJobId?: string;
  /** 1 on the first run, incremented by Retry. */
  attempt?: number;
}

interface ProjectBase {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string; // ISO date
  /** Paid calls so far for this project (database mode). Demo projects show an estimate instead. */
  spentUsd?: number;
  /** Budget per creative: the whole ad (A) or each language version (B). */
  budgetUsd?: number;
  /** Estimate shown before the start, kept for the project page. */
  estimateUsd?: number;
  /** Credits charged for this project from the ledger (reserved while running, settled when done, 0 after a refund). Missing = no ledger rows. */
  creditsUsed?: number;
  /**
   * Grouping (2026-10-21): an ad made as "another version" points at the first ad of its group
   * (the root); a translation made from an ad points at that ad. Missing = a project on its own.
   */
  parentId?: string;
  /** 1 for the first ad of a group, 2 for the next version, and so on. Missing = 1. */
  version?: number;
  /** "Make variations": the batch this project belongs to. */
  batchId?: string;
  /** Organisation: free tags for search; archived projects stay but leave the default lists. */
  tags?: string[];
  archivedAt?: string;
}

/** A set of 2–5 variations of one product, each its own project and run. */
export type BatchStatus = "processing" | "completed" | "partial" | "failed";
export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  createdAt: string;
  projectIds: string[];
}

/** Workflow A: one product → one finished 9:16 ad. */
export interface AdProject extends ProjectBase {
  workflow: "ad";
  /** Chosen ad length in seconds (one of AD_LENGTHS). Older projects: undefined = 30. */
  seconds?: number;
  /** Presenter quality: "avatar_iii" (Standard) or "avatar_iv" (Premium). Customers only ever see the labels. */
  engine?: "avatar_iii" | "avatar_iv";
  /** Chosen presenter look id; undefined = the configured default look. */
  lookId?: string;
  /** Language of the script, the captions and the voice (AD_LANGUAGE when missing). */
  language?: string;
  /** Accent/region key for the voice (from the voice list), e.g. "uk". */
  accent?: string;
  /** Chosen voice id; missing = the look's default voice when it fits the language. */
  voiceId?: string;
  /** Speaking speed: slower | normal | faster. */
  speed?: "slower" | "normal" | "faster";
  /** Offer line used in the call to action, e.g. "20% off this week". Empty: no offer is mentioned. */
  offer?: string;
  /** Free direction for the script (audience, emphasis). Data, never instructions. */
  direction?: string;
  /** Tone of the script: elegant | playful | direct | warm. */
  tone?: "elegant" | "playful" | "direct" | "warm";
  /** Presenter background: a colour, or a signed/object URL of the customer's image. Missing = the look's own. */
  background?: { type: "color"; value: string } | { type: "image"; url?: string };
  /** Brand style for the final edit (accent hex, caption style key, font key, logo URL). */
  brand?: { accent?: string; captionStyle?: string; font?: string; logoUrl?: string };
  /** Pause after the script, before the paid presenter step, until the customer approves. */
  reviewScript?: boolean;
  /** Chosen format from the library (src/content/formats.ts); it only filled direction and tone. */
  format?: string;
  /** Hook style from a batch variation; it only filled the direction. */
  hook?: string;
  /** The generated script, shown for review while the script step waits for the customer. */
  generatedScript?: GeneratedScript;
  productName: string;
  productUrl?: string;
  description: string;
  imageUrls: string[];
  script?: string;
  steps: Record<StepKey, Step>;
  finalVideoUrl?: string;
}

/**
 * A key from the translation-language catalogue (`src/lib/translateLanguages.ts`, 190 languages
 * and regional variants, e.g. "en", "nl", "dutch-belgium", "english-uk"). Validated at the API.
 */
export type LanguageCode = string;

/** HeyGen translation modes: speed (standard lip-sync) or precision (redrawn mouth, slower, pricier). */
export type TranslationQuality = "speed" | "precision";

/** One subtitle fragment. Times in seconds. */
export interface Segment {
  index: number;
  start: number;
  end: number;
  /** Text in the source language, shown next to the translation while reviewing. */
  original: string;
  /** The translation as the service delivered it; "Reset" brings a fragment back to this. */
  translated: string;
  /** Current text as it will be spoken and shown. Editable by the user. */
  text: string;
}

/** The result for one target language. */
export interface Translation {
  language: LanguageCode;
  status: StepStatus;
  segments: Segment[];
  /** Finished video with captions for this language. */
  videoUrl?: string;
  /** Plain-language reason when this language version stopped (e.g. its budget was reached). */
  error?: string;
  /** Paid calls so far for this language version, including its share of shared costs. */
  spentUsd?: number;
  /** Outcome of the automatic quality check that replaced the manual review. */
  qa?: { changes: { index: number; before: string; after: string; reason: string }[]; warnings: string[]; summary?: string };
}

/** Workflow B: an existing video → the same video in other languages. */
export interface TranslateProject extends ProjectBase {
  workflow: "translate";
  sourceFileName: string;
  sourceSeconds: number;
  /** Object/blob URL in demo mode, storage URL later. */
  sourceVideoUrl?: string;
  sourceLanguage: LanguageCode | "auto";
  /** Set once the translation step has run. */
  detectedLanguage?: LanguageCode;
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  /** Picture enhancement before the captions (+1 credit per second). */
  enhance?: boolean;
  /**
   * When the user confirmed they own the video and have the speaker's consent
   * (rule 7 in CLAUDE.md). A translate project cannot exist without it.
   */
  rightsConfirmedAt: string; // ISO date
  /** How the rights were established: the customer's confirmation on an upload, or the video was generated by them in the app. */
  rightsBasis?: "own_upload" | "generated";
  steps: Record<TranslateStepKey, Step>;
  translations: Translation[];
}

export type Project = AdProject | TranslateProject;

/** A presenter look the customer can pick (portrait only; provider names never reach the UI). */
export interface Presenter {
  id: string;
  name: string;
  gender: "female" | "male" | "other";
  /** Preview photo; undefined in demo mode (a placeholder is shown). */
  previewUrl?: string;
  /** Qualities this presenter supports: "avatar_iii" = Standard, "avatar_iv" = Premium. */
  engines: ("avatar_iii" | "avatar_iv")[];
  /** Shown first in the picker. */
  featured: boolean;
  /** The look's default voice; preselected when it fits the chosen language. */
  defaultVoiceId?: string;
}

export interface PresenterPage {
  items: Presenter[];
  page: number;
  hasMore: boolean;
  /** The look used when the customer picks nothing. */
  defaultId: string;
}

/** What the customer sees and edits on the script review. */
export interface GeneratedScript {
  /** Three spoken hooks; the first sentence of the ad. Nothing is shown as text on screen except the captions. */
  hooks: { spoken: string }[];
  presenterScript: string;
  /** Hard word limit for presenterScript at this ad length. */
  maxWords: number;
}
