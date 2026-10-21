import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

export const metadata: Metadata = { title: "Page not found" };

/** Outside the app group, so the shell (session, database) streams behind its own Suspense boundary. */
export default function NotFound() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-hidden />}>
      <AppShell>
        <ErrorState
          title="Page not found"
          description="That link does not lead anywhere. Check the address or head back to the dashboard."
          action={
            <Button href="/dashboard">
              <ArrowLeft className="size-4" aria-hidden />
              Back to dashboard
            </Button>
          }
        />
      </AppShell>
    </Suspense>
  );
}
