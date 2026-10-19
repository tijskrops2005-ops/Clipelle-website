"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { config } from "@/lib/config";

type Health = { demoMode: boolean; database: boolean | null; jobs: boolean | null };

/**
 * Shown above the forms in database mode when the database or the job system is not reachable,
 * so a click on "Generate video" never fails silently. Renders nothing while everything is fine.
 */
export function ServiceStatusBanner() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    if (config.demoMode) return;
    let stopped = false;
    const check = () =>
      fetch("/api/health", { cache: "no-store" })
        .then((r) => r.json())
        .then((h: Health) => {
          if (!stopped) setHealth(h);
        })
        .catch(() => {
          if (!stopped) setHealth({ demoMode: false, database: false, jobs: false });
        });
    void check();
    const id = window.setInterval(check, 15000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  if (!health || health.demoMode || (health.database && health.jobs)) return null;

  const problems: string[] = [];
  if (!health.database) problems.push("the database is not reachable (check DATABASE_URL and whether the Supabase project is paused)");
  if (!health.jobs) problems.push("the background job service is not running (on your laptop: run `npm run dev:jobs` in a second terminal)");

  return (
    <div role="alert" className="flex items-start gap-3 rounded-[14px] border border-danger/40 bg-danger/5 p-4 text-sm text-ink">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <p>
        <span className="font-medium">Videos cannot start right now:</span> {problems.join("; ")}. The form stays usable; the start button works again as soon as this message disappears.
      </p>
    </div>
  );
}
