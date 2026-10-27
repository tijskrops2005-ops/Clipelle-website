"use client";

import { useEffect, useRef } from "react";
import { downloadHref } from "@/lib/data/client";
import type { Project } from "@/lib/types";

/**
 * The Download button in the "your video is ready" e-mail links to /projects/<id>?download=1 (an ad)
 * or ?download=<language> (27 Oct 2026). The sign-in comes first when needed (the proxy keeps the
 * query); once the project has loaded as completed, this starts the same download as the button on
 * the page, once, and takes the parameter out of the address so a reload does not download again.
 */
export function useDownloadFromLink(project: Project | undefined) {
  const started = useRef(false);
  useEffect(() => {
    if (!project || project.status !== "completed" || started.current) return;
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("download");
    if (!wanted) return;
    started.current = true;
    params.delete("download");
    const rest = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
    if (project.workflow === "ad") {
      if (project.finalVideoUrl) window.location.replace(downloadHref(project.id, project.finalVideoUrl));
      return;
    }
    const version = project.translations.find((t) => t.language === wanted && t.videoUrl) ?? project.translations.find((t) => t.videoUrl);
    if (version?.videoUrl) window.location.replace(downloadHref(project.id, version.videoUrl, version.language));
  }, [project]);
}
