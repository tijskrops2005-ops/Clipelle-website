import { config } from "@/lib/config";
import type { TranslateStepKey } from "@/lib/types";
import type { StepMeta } from "@/components/pipeline/PipelineStep";

/** The four fixed steps of the translate workflow, in order. */
export const TRANSLATE_STEPS: TranslateStepKey[] = ["upload", "translate", "review", "captions"];

export const translateStepMeta: Record<TranslateStepKey, StepMeta> = {
  upload: {
    number: 1,
    title: "Upload",
    service: config.productName,
    description: "Your video is checked and stored safely, together with your rights confirmation.",
    waitingNote: "Queued. Starts as soon as the workflow begins.",
    doneLabel: "Video received",
  },
  translate: {
    number: 2,
    title: "Translate",
    service: config.services.translate,
    description: "The speech is transcribed and translated, a voice that sounds like the speaker is prepared, and the lip movements are matched.",
    waitingNote: "Starts when the upload is done.",
    doneLabel: "Translation ready",
  },
  review: {
    number: 3,
    title: "Review",
    service: "You",
    description: "You check every fragment next to the original, rewrite it in ad tone if you like, and approve before anything is rendered.",
    waitingNote: "Waits until the translation is ready.",
    needsInputNote: "Check the translation below and click Create videos.",
    doneLabel: "Approved",
  },
  captions: {
    number: 4,
    title: "Captions and 9:16",
    service: config.services.captions,
    description: "The translated video gets TikTok-style captions and the vertical 9:16 format, one file per language.",
    waitingNote: "Waits for your approval.",
    doneLabel: "Videos ready",
  },
};
