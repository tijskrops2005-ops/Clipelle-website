import { config } from "@/lib/config";

/**
 * The texts of the "ready" and "failed" e-mails (pure, tested). Short, in our voice, one link,
 * no marketing, no provider names. The link goes to the project or batch page.
 */
export type ProjectMailInput = { name: string; status: "completed" | "failed"; kind: "ad" | "translate"; url: string; error?: string; recipientName?: string | null };
export type BatchMailInput = { name: string; status: "completed" | "partial" | "failed"; finished: number; failed: number; total: number; url: string; recipientName?: string | null };

function greeting(name?: string | null) {
  const first = name?.trim().split(" ")[0];
  return first ? `Hi ${first},` : "Hi,";
}

export function composeProjectMail(input: ProjectMailInput): { subject: string; text: string } {
  const what = input.kind === "ad" ? "ad" : "translation";
  if (input.status === "completed") {
    return {
      subject: `Your ${what} "${input.name}" is ready`,
      text: `${greeting(input.recipientName)}\n\nYour ${what} "${input.name}" is finished and ready to download.\n\n${input.url}\n\n${config.productName}`,
    };
  }
  return {
    subject: `Your ${what} "${input.name}" stopped`,
    text: `${greeting(input.recipientName)}\n\nYour ${what} "${input.name}" stopped before it was finished.${input.error ? `\n\nWhat happened: ${input.error}` : ""}\n\nOpen the project to retry the step; credits for a failed run are refunded.\n\n${input.url}\n\n${config.productName}`,
  };
}

export function composeBatchMail(input: BatchMailInput): { subject: string; text: string } {
  const summary = input.failed === 0 ? `All ${input.total} variations are ready to download.` : input.finished === 0 ? `None of the ${input.total} variations finished.` : `${input.finished} of ${input.total} variations are ready; ${input.failed} stopped.`;
  return {
    subject: input.status === "completed" ? `Your ${input.total} variations of "${input.name}" are ready` : input.status === "partial" ? `${input.finished} of ${input.total} variations of "${input.name}" are ready` : `Your variations of "${input.name}" stopped`,
    text: `${greeting(input.recipientName)}\n\n${summary}${input.failed > 0 ? " Open a stopped one to retry it; its credits are refunded." : ""}\n\n${input.url}\n\n${config.productName}`,
  };
}
