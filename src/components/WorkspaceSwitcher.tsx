"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { config } from "@/lib/config";

type Ws = { id: string; name: string; kind: string; role: string };

/** Which workspace the app acts in: a select that stores the choice in a cookie and refreshes. Hidden with one workspace. */
export function WorkspaceSwitcher({ current, workspaces }: { current: Ws; workspaces: Ws[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (config.demoMode || workspaces.length <= 1) return null;
  async function pick(id: string) {
    if (id === current.id) return;
    setBusy(true);
    try {
      await fetch("/api/workspaces/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: id }) });
      router.refresh();
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }
  const Icon = current.kind === "team" ? Building2 : UserRound;
  return (
    <label className="flex items-center gap-2 rounded-control bg-surface px-2 py-1.5 shadow-card">
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="sr-only">Workspace</span>
      <select value={current.id} onChange={(e) => pick(e.target.value)} disabled={busy} className="focus-ring w-full bg-transparent text-sm font-medium text-ink" aria-label="Workspace">
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name}{w.kind === "team" ? " (team)" : ""}</option>
        ))}
      </select>
    </label>
  );
}
