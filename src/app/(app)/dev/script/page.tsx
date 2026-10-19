import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScriptTestPanel } from "./ScriptTestPanel";

export const metadata: Metadata = { title: "Script test" };

/** Developer-only test bench for step 2 (hook + script via the Claude API). 404 outside development. */
export default function ScriptTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Only whether the key exists reaches the browser, never its value.
  const keyPresent = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  return (
    <div className="space-y-10">
      <PageHeader
        title="Script test"
        badge={<Badge tone="danger">Live API · real costs</Badge>}
        description="Standalone check of the script step: product information plus a photo go to Claude, which returns a hook, a presenter script, scenes, benefits and an offer as structured JSON. One call costs a few cents; you confirm first."
      />
      <ScriptTestPanel keyPresent={keyPresent} />
    </div>
  );
}
