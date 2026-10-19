import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { TranslateTestPanel } from "./TranslateTestPanel";

export const metadata: Metadata = { title: "Translate test" };

/** Developer-only test bench for Workflow B (translate an existing video). 404 outside development. */
export default function TranslateTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const keys = {
    heygen: Boolean(process.env.HEYGEN_API_KEY?.trim()),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    shotstack: Boolean(process.env.SHOTSTACK_API_KEY?.trim()),
  };
  const shotstackEnv = process.env.SHOTSTACK_ENV?.trim() === "v1" ? "v1" : "stage";

  return (
    <div className="space-y-10">
      <PageHeader
        title="Translate test"
        badge={<Badge tone="danger">Live API · real costs</Badge>}
        description="Standalone check of Workflow B: upload a video to HeyGen, start a proofread session, edit the translated subtitles (optionally rewritten by Claude), render the translation, then add TikTok-style captions and the 9:16 format with Shotstack. Every paid step asks for confirmation and runs through the cost guard."
      />
      <TranslateTestPanel keys={keys} shotstackEnv={shotstackEnv} />
    </div>
  );
}
