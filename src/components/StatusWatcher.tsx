"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { dismissToast, markAllSeen, pushNotice, useToasts, useUnseenCount } from "@/lib/notificationStore";
import { languageOf } from "@/lib/languages";
import { cn } from "@/lib/utils";

/**
 * Mounted once in the app shell: watches the project list (demo runner or database polling) and
 * turns a status change to completed or failed into a notice (badge + toast). The first snapshot
 * never counts, so a reload does not announce old videos. The Projects page clears the badge,
 * and the tab title shows the count elsewhere.
 */
export function StatusWatcher() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const pathname = usePathname();
  const previous = useRef<Map<string, string> | null>(null);
  const unseen = useUnseenCount();

  useEffect(() => {
    if (!ready) return;
    // Keys: the project, and every language version of a translation (27 Oct 2026: a finished
    // language is announced on its own; the whole translation then only announces a failure).
    const now = new Map<string, string>();
    for (const p of projects) {
      now.set(p.id, p.status);
      if (p.workflow === "translate") for (const t of p.translations) now.set(`${p.id}:${t.language}`, t.status);
    }
    if (previous.current) {
      for (const [key, status] of now) {
        const before = previous.current.get(key);
        if (!before || before === status || (status !== "completed" && status !== "failed")) continue;
        const [id, language] = key.split(":");
        const p = projects.find((x) => x.id === id);
        if (!p) continue;
        if (language) {
          if (status === "completed") pushNotice({ projectId: id, name: `${p.name} · ${languageOf(language).label}`, status, href: `/projects/${id}`, language });
        } else if (p.workflow !== "translate" || status === "failed") {
          pushNotice({ projectId: id, name: p.name, status, href: `/projects/${id}` });
        }
      }
    }
    previous.current = now;
  }, [projects, ready]);

  useEffect(() => {
    if (pathname === "/projects") markAllSeen();
  }, [pathname, projects]);

  // The tab title carries the count of unseen finished videos on every other page.
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\) /, "");
    if (unseen > 0 && pathname !== "/projects") document.title = `(${unseen}) ${strip(document.title)}`;
    else document.title = strip(document.title);
  }, [unseen, pathname]);

  return <Toaster />;
}

function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-card bg-surface p-4 shadow-card-hover">
          {t.status === "completed" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-ink">{t.status === "completed" ? (t.language ? `Your ${languageOf(t.language).label} video is ready` : "Video ready") : "A video stopped"}</p>
            <Link href={t.href} onClick={() => dismissToast(t.id)} className={cn("focus-ring block truncate rounded-control text-muted underline-offset-2 hover:underline")}>{t.name}</Link>
          </div>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="focus-ring rounded-full p-1 text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Small count next to "Projects" in the navigation. */
export function UnseenBadge({ href }: { href: string }) {
  const unseen = useUnseenCount();
  if (href !== "/projects" || unseen === 0) return null;
  return <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white" aria-label={`${unseen} finished since your last visit`}>{unseen}</span>;
}
