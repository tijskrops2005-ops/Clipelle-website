"use client";

import { useEffect } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Catches render errors on any page inside the app shell. The sidebar stays usable;
 * only the page content is replaced by this message.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Stage 10: send to error monitoring. For now the console is enough.
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong on this page"
      description="The page could not be shown. Your projects are safe. Try again, or go back to the dashboard."
      action={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button href="/dashboard" variant="secondary">
            <ArrowLeft className="size-4" aria-hidden />
            Back to dashboard
          </Button>
        </div>
      }
    />
  );
}
