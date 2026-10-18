/** Status of one pipeline step (Vmake, HeyGen or VEED). */
export type StepStatus = "waiting" | "processing" | "completed" | "failed";

/** Overall status of a project. */
export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export type StepKey = "vmake" | "heygen" | "veed";

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
