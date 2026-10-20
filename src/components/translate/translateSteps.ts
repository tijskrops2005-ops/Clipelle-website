import { config } from "@/lib/config";
import type { TranslateStepKey } from "@/lib/types";
import type { StepMeta } from "@/components/pipeline/PipelineStep";

/** The three fixed steps of the translate workflow, in order (the manual review was removed on 2026-10-20). */
export const TRANSLATE_STEPS: TranslateStepKey[] = ["upload", "translate", "captions"];

export const translateStepMeta: Record<TranslateStepKey, StepMeta> = {
  upload: {
    number: 1,
    title: "Upload",
    service: config.stepLabels.upload,
    description: "Your video is checked and stored safely, together with your rights confirmation.",
    waitingNote: "Queued. Starts as soon as the workflow begins.",
    doneLabel: "Video received",
  },
  translate: {
    number: 2,
    title: "Translate",
    service: config.stepLabels.translate,
    description: "The speech is transcribed and translated, every line is checked automatically against the original (missing words, numbers, names, natural phrasing) and corrected where needed.",
    waitingNote: "Starts when the upload is done.",
    doneLabel: "Translation checked",
  },
  captions: {
    number: 3,
    title: "Captions and 9:16",
    service: config.stepLabels.captions,
    description: "The voice is matched to the lips, then the video gets captions and the vertical 9:16 format, one file per language.",
    waitingNote: "Starts when the translation is checked.",
    doneLabel: "Videos ready",
  },
};
