"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Run = { runId: string; status: string; output: unknown; startedAt: string | null; endedAt: string | null };

export function JobsPanel() {
  const [devServer, setDevServer] = useState<boolean | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [failOnce, setFailOnce] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll the dev server for the run of the last event (free, local).
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/dev/jobs${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`);
        const b = await r.json();
        if (stopped) return;
        setDevServer(Boolean(b.devServer));
        setRuns(b.runs ?? []);
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [eventId]);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/dev/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Tijs", failOnce }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
      setEventId(b.eventId);
      setRuns([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const done = runs.some((r) => r.status === "Completed");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Smoke test</CardTitle>
          {devServer === null ? null : devServer ? <Badge tone="success">dev server on :8288</Badge> : <Badge tone="danger">dev server not running</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {devServer === false && (
            <p className="rounded-[14px] bg-surface-muted p-4 text-sm text-ink">
              Start it in a second terminal: <code className="font-mono text-[13px]">npm run dev:jobs</code>. The app itself must run with <code className="font-mono text-[13px]">npm run dev</code> (it sets INNGEST_DEV=1).
            </p>
          )}
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={failOnce} onChange={(e) => setFailOnce(e.target.checked)} className="size-4 accent-ink" />
            Let the second step fail once, to see a retry
          </label>
          <Button onClick={send} disabled={sending || devServer === false}>
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
            Send dev/hello
          </Button>
          {eventId && <p className="label-mono text-muted">event {eventId}</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Run</CardTitle>
          {done && <Badge tone="success">completed</Badge>}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {runs.length === 0 && <p className="text-muted">{eventId ? "Waiting for the run to appear…" : "Send the event to see a run here."}</p>}
          {runs.map((r) => (
            <div key={r.runId} className="rounded-[14px] bg-surface-muted p-4">
              <p className="flex items-center justify-between gap-3">
                <span className="label-mono text-muted">{r.runId.slice(0, 12)}…</span>
                <Badge tone={r.status === "Completed" ? "success" : r.status === "Failed" ? "danger" : "accent"}>{r.status}</Badge>
              </p>
              {r.output !== null && r.output !== undefined && (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] text-ink">{JSON.stringify(r.output, null, 2)}</pre>
              )}
            </div>
          ))}
          <p className="text-[13px] text-muted">Steps, attempts and timings: open <a className="underline" href="http://localhost:8288/runs" target="_blank" rel="noreferrer">localhost:8288/runs</a>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
