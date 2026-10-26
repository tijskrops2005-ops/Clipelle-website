"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, FolderOpen, LayoutGrid, Rows3 } from "lucide-react";
import { config } from "@/lib/config";
import type { AdProject, BatchStatus } from "@/lib/types";
import { downloadHref, useBatch } from "@/lib/data/client";
import { useStatusTitle } from "@/lib/useStatusTitle";
import { formatByKey, hookByKey } from "@/content/formats";
import { projectDurationMs } from "@/lib/projectMeta";
import { chargedCredits, projectCredits } from "@/lib/projectCredits";
import { formatTook } from "@/components/pipeline/PipelineStep";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { PageHeaderSkeleton, TileGridSkeleton } from "@/components/ui/Skeleton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { DemoBadge } from "@/components/DemoModeBadge";
import { cn, formatDate } from "@/lib/utils";

const statusTone: Record<BatchStatus, { tone: "neutral" | "success" | "warning" | "danger"; label: string }> = {
  processing: { tone: "neutral", label: "Processing" },
  completed: { tone: "success", label: "Completed" },
  partial: { tone: "warning", label: "Partly done" },
  failed: { tone: "danger", label: "Failed" },
};

/** Variation name without the batch name in front: "Glow launch · Unboxing" → "Unboxing". */
function variantTitle(p: AdProject) {
  const f = formatByKey(p.format);
  const h = hookByKey(p.hook);
  return f ? f.name : h ? `${h.name} hook` : p.name.split(" · ").pop() ?? p.name;
}

/** All variations of one batch side by side: status, hook or format, cost and result; Compare and Download all. */
export function BatchView({ id }: { id: string }) {
  const { batch, projects, ready } = useBatch(id);
  const [view, setView] = useState<"cards" | "compare">("cards");
  useStatusTitle(batch ? { status: batch.status, name: batch.name } : null);

  if (!batch) {
    if (!ready) {
      return (
        <div className="space-y-10" aria-busy="true">
          <PageHeaderSkeleton />
          <TileGridSkeleton count={3} />
        </div>
      );
    }
    return <EmptyState icon={<FolderOpen className="size-6" aria-hidden />} title="Batch not found" description="It may have been removed, or the link is incomplete." action={<Button href="/projects" variant="secondary"><ArrowLeft className="size-4" aria-hidden />Projects</Button>} />;
  }

  const done = projects.filter((p) => p.status === "completed" && p.finalVideoUrl);
  const credits = projects.reduce((sum, p) => sum + (config.demoMode ? projectCredits(p) : chargedCredits(p)), 0);
  const st = statusTone[batch.status];

  function downloadAll() {
    // One click, one download per finished variation: the browser handles each link in turn.
    done.forEach((p, i) => {
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = downloadHref(p.id, p.finalVideoUrl!);
        a.download = `${p.name}.mp4`;
        a.rel = "noreferrer";
        document.body.append(a);
        a.click();
        a.remove();
      }, i * 400);
    });
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={
          <Link href="/projects" className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            Projects
          </Link>
        }
        title={batch.name}
        badge={<Badge tone={st.tone} className="translate-y-1">{st.label}</Badge>}
        description={`${projects.length} variations · created ${formatDate(batch.createdAt)} · ${done.length} of ${projects.length} finished`}
        actions={
          <div className="flex items-center gap-3">
            <SegmentedControl label="View" size="sm" options={[{ key: "cards", label: "Cards" }, { key: "compare", label: "Compare" }]} value={view} onChange={setView} />
            <Button type="button" variant="accent" onClick={downloadAll} disabled={done.length === 0}>
              <Download className="size-4" aria-hidden />
              Download all{done.length ? ` (${done.length})` : ""}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4 pt-6 text-sm sm:grid-cols-3">
          <div><p className="label-mono mb-1 text-muted">Variations</p><p className="text-ink/90">{projects.length} · each its own video and run</p></div>
          <div><p className="label-mono mb-1 text-muted">Credits</p><p className="text-ink/90">{credits} in total{config.demoMode ? " · demo" : ""}</p></div>
          <div><p className="label-mono mb-1 text-muted">If one fails</p><p className="text-ink/90">Credits are reserved per variation; a failed one refunds its own.</p></div>
        </CardContent>
      </Card>

      {view === "compare" ? (
        <section className="space-y-5">
          <SectionHeader title="Compare" description="Finished variations side by side. Unfinished ones show their status." aside={<DemoBadge>Demo placeholders</DemoBadge>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {projects.map((p) => (
              <div key={p.id} className="space-y-2">
                {p.status === "completed" && p.finalVideoUrl ? (
                  <VideoPlayer src={p.finalVideoUrl} poster={p.imageUrls[0]} simulated={config.demoMode} className="w-full" />
                ) : (
                  <div className="grid aspect-[9/16] place-items-center rounded-tile bg-surface-muted p-4 text-center text-[13px] text-muted">
                    <StatusBadge status={p.status} />
                  </div>
                )}
                <p className="text-sm font-medium text-ink">{variantTitle(p)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <SectionHeader title="Variations" description="Status, format or hook, cost and result per variation. Open one for its pipeline and retry." aside={<DemoBadge>Demo placeholders</DemoBadge>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const took = projectDurationMs(p);
              const f = formatByKey(p.format);
              const h = hookByKey(p.hook);
              return (
                <Card key={p.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-ink">{variantTitle(p)}</p>
                        <p className="text-[13px] text-muted">{f ? `Format · ${f.hookStyle}` : h ? `Hook · ${h.blurb}` : p.name}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                      <dt className="text-muted">Credits</dt>
                      <dd className="text-ink/90">{config.demoMode ? projectCredits(p) : chargedCredits(p)}</dd>
                      <dt className="text-muted">Ready in</dt>
                      <dd className="text-ink/90">{took !== undefined && p.status === "completed" ? formatTook(took) : "—"}</dd>
                      {p.status === "failed" && (
                        <>
                          <dt className="text-muted">Stopped</dt>
                          <dd className="text-danger">{Object.values(p.steps).find((s) => s.status === "failed")?.error ?? "A step stopped."}</dd>
                        </>
                      )}
                    </dl>
                    <div className={cn("mt-auto flex flex-wrap gap-2")}>
                      <Button href={`/projects/${p.id}`} variant="secondary" size="sm">
                        {p.status === "failed" ? "Open and retry" : "Open"}
                      </Button>
                      {p.status === "completed" && p.finalVideoUrl && (
                        <Button href={downloadHref(p.id, p.finalVideoUrl)} prefetch={false} variant="primary" size="sm" download>
                          <Download className="size-4" aria-hidden />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
      <p className="flex items-center gap-2 text-[13px] text-muted"><Rows3 className="size-4" aria-hidden /><LayoutGrid className="size-4" aria-hidden /> Switch between cards and the side-by-side view above.</p>
    </div>
  );
}
