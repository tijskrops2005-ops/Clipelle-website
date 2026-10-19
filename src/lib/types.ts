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
export type TranslateStepKey = "upload" | "translate" | "review" | "captions";

export interface Step {
  status: StepStatus;
  startedAt?: string; // ISO date
  finishedAt?: string; // ISO date
  /** Plain-language error shown to the user when status is "failed". */
  error?: string;
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
}

/** Workflow A: one product → one finished 9:16 ad. */
export interface AdProject extends ProjectBase {
  workflow: "ad";
  productName: string;
  productUrl?: string;
  description: string;
  imageUrls: string[];
  script?: string;
  steps: Record<StepKey, Step>;
  finalVideoUrl?: string;
}

/** Languages offered in the first version of the translate workflow. */
export type LanguageCode = "sk" | "de" | "fr" | "nl" | "en";

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
  /** Finished 9:16 video with captions for this language. */
  videoUrl?: string;
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
  /**
   * When the user confirmed they own the video and have the speaker's consent
   * (rule 7 in CLAUDE.md). A translate project cannot exist without it.
   */
  rightsConfirmedAt: string; // ISO date
  steps: Record<TranslateStepKey, Step>;
  translations: Translation[];
}

export type Project = AdProject | TranslateProject;
