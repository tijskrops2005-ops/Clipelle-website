/** Status of one pipeline step. */
export type StepStatus = "waiting" | "processing" | "completed" | "failed";

/** Overall status of a project. */
export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

/**
 * Steps of the ad workflow, named after what they do, not after the provider
 * (the provider behind each step is in config.services and can be swapped).
 */
export type StepKey = "productClip" | "presenter" | "finalEdit";

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

export interface Project {
  id: string;
  name: string;
  productName: string;
  productUrl?: string;
  description: string;
  imageUrls: string[];
  script?: string;
  status: ProjectStatus;
  steps: Record<StepKey, Step>;
  finalVideoUrl?: string;
  createdAt: string; // ISO date
}
