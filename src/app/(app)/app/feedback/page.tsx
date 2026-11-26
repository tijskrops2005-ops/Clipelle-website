import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata: Metadata = { title: "Feedback" };

export default function FeedbackPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Feedback" />
      <div className="max-w-2xl">
        <FeedbackForm />
      </div>
    </div>
  );
}
