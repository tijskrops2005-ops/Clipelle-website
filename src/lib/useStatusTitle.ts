"use client";

import { useEffect } from "react";
import { config } from "@/lib/config";

const labels: Record<string, string> = { draft: "Draft", processing: "Processing", review: "Waiting for you", completed: "Ready", failed: "Stopped", partial: "Partly done" };

/** The browser tab shows the status in front of the project or batch name, and updates as it changes. */
export function useStatusTitle(item: { status: string; name: string } | null) {
  useEffect(() => {
    if (!item) return;
    const unseen = document.title.match(/^\(\d+\) /)?.[0] ?? "";
    document.title = `${unseen}${labels[item.status] ?? item.status} · ${item.name} · ${config.productName}`;
  }, [item?.status, item?.name]); // eslint-disable-line react-hooks/exhaustive-deps
}
