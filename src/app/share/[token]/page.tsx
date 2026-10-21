import type { Metadata } from "next";
import { Suspense } from "react";
import { config } from "@/lib/config";
import { resolveShareToken } from "@/lib/shareLinks";
import { languageLabel } from "@/lib/languages";
import { Brand } from "@/components/Brand";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Shared video", robots: { index: false, follow: false, nocache: true } };
export const instant = false;

/**
 * Public, read-only viewing page: the video and its name, nothing else of the project. Unknown,
 * expired or revoked tokens all look the same. Not indexed.
 */
async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = config.demoMode ? null : await resolveShareToken(token);
  if (!shared) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <Brand />
        <h1 className="text-title">This link is not available</h1>
        <p className="text-[15px] text-muted">It may have expired or been withdrawn by the person who shared it. Ask them for a new link.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center gap-6 px-6 py-10">
      <Brand />
      <h1 className="text-center text-title">{shared.name}</h1>
      <VideoPlayer src={shared.videoUrl} className="w-full max-w-[360px]" />
      <p className="text-center text-[13px] text-muted">
        {shared.language ? `${languageLabel(shared.language)} version · ` : ""}Shared for viewing{shared.allowDownload ? " and download" : ""} · available until {new Date(shared.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
      </p>
      {shared.allowDownload && (
        <Button href={shared.videoUrl} variant="accent" download>
          <Download className="size-4" aria-hidden />
          Download video
        </Button>
      )}
      <p className="mt-auto text-[12px] text-muted">Made with {config.productName}.</p>
    </main>
  );
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={null}>
      <Shared params={params} />
    </Suspense>
  );
}
