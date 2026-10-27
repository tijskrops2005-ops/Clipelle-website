import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowChooser } from "@/components/WorkflowChooser";
import { CreateHeader } from "@/components/CreateHeader";

export const metadata: Metadata = { title: "New video" };

/** First choice when creating a video: which of the two workflows. Signed out: an explanation and the sign-in button. */
export default async function NewVideoPage() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-10 text-center">
        <PageHeader title="Sign in to make a video" description="Your projects, credits and brand style belong to your account. Sign in, or create an account and get 30 free credits after you verify your e-mail." />
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/login?next=/new" variant="accent" size="lg"><LogIn className="size-5" aria-hidden /> Sign in</Button>
          <Button href="/signup?next=/new" variant="secondary" size="lg">Create an account</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CreateHeader eyebrow="New video" title="What do you want to make?" text={config.features.ads ? "Translate a video you own, or make a new ad. Everything runs on its own after you click start." : "Translate a video you own, with the speaker's own voice or an AI presenter. Everything runs on its own after you click start."} />
      <WorkflowChooser />
    </div>
  );
}
