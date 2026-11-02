"use client";

import { useEffect } from "react";
import { discardStaged } from "@/lib/data/client";
import { clearDrafts, readDraft } from "@/lib/forms/formDraft";
import { useDraftScope } from "@/lib/forms/DraftScope";
import type { StagedUpload } from "@/lib/data/uploads";

/**
 * "Create new video" starts clean (2 Nov 2026): opening /new forgets the drafts of this user in this
 * workspace, and a video that was staged for the translate draft is removed from storage. A form
 * reached any other way (refresh, back, the dashboard's quick action) keeps its draft.
 */
export function ClearDrafts() {
  const scope = useDraftScope();
  useEffect(() => {
    if (!scope) return;
    const translate = readDraft<{ staged?: StagedUpload | null }>("translate", scope);
    if (translate?.data.staged?.path) void discardStaged(translate.data.staged.path);
    clearDrafts(scope);
  }, [scope]);
  return null;
}
