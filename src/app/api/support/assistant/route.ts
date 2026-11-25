import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { dataErrorResponse } from "@/lib/data/server";
import { DataError } from "@/lib/data/errors";
import { rateLimit } from "@/lib/rateLimit";
import { assistantEnabled } from "@/lib/support";
import { reserveSpend, settleSpend, CostGuardError } from "@/lib/services/costGuard";
import { answerSupport, estimateSupportUsd, SupportAssistantError } from "@/lib/services/supportAssistant";
import { readJson } from "../../projects/_guard";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) }))
    .min(1)
    .max(16)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "The conversation must start and end with a question."),
});

const DEMO_ANSWER = "Demo mode: the assistant answers for real once the app runs with its database. Until then, the questions and answers page covers credits, file formats and processing times.";

/**
 * The support assistant (25 Nov 2026): signed-in customers only, behind NEXT_PUBLIC_SUPPORT_ASSISTANT=on,
 * 20 questions per hour per account, and every answer through the cost guard like any paid call.
 */
export async function POST(request: Request) {
  if (!assistantEnabled()) return Response.json({ error: "The assistant is not available." }, { status: 404 });
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Type a question first." }, { status: 400 });
  try {
    const scope = await requireScope();
    if (config.demoMode) return Response.json({ answer: DEMO_ANSWER, needsHuman: false, demo: true });
    const limit = await rateLimit(`assistant:${scope.userId}`, 20, 60 * 60 * 1000);
    if (!limit.ok) throw new DataError("You asked a lot of questions in a short time. Try again later, or contact support.", 429, "rate_limited");
    const turns = parsed.data.messages;
    const chars = turns.reduce((n, t) => n + t.content.length, 0);
    let entryId = "";
    try {
      const reserved = await reserveSpend({ service: "anthropic", action: "support_answer", estimatedUsd: estimateSupportUsd(chars), fingerprintInput: { userId: scope.userId, turns, at: Date.now() }, userId: scope.userId, meta: { model: "claude-opus-5-5", turns: turns.length } });
      entryId = reserved.entryId;
    } catch (error) {
      if (error instanceof CostGuardError) throw new DataError("The assistant is not available right now. Contact support instead.", 503, "assistant_unavailable");
      throw error;
    }
    try {
      const r = await answerSupport(turns);
      await settleSpend(entryId, { status: "completed", actualUsd: r.costUsd, basis: "tokens" });
      return Response.json({ answer: r.answer, needsHuman: r.needsHuman });
    } catch (error) {
      await settleSpend(entryId, { status: "failed", actualUsd: 0 });
      if (error instanceof SupportAssistantError) throw new DataError(error.message, error.status, error.code);
      throw error;
    }
  } catch (error) {
    return dataErrorResponse(error);
  }
}
