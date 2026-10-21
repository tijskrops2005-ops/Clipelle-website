"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

type Info = { base: string | null; heygenEvents: string[]; endpoints: { endpoint_id: string; url: string; events: string[] | null; status: string }[]; endpointsError: string | null; events: { id: string; provider: string; externalId: string; eventType: string; receivedAt: string }[] };

export function WebhooksPanel() {
  const [info, setInfo] = useState<Info | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/dev/webhooks", { cache: "no-store" });
    return (await r.json()) as Info;
  }
  useEffect(() => {
    let alive = true;
    load().then((i) => alive && setInfo(i)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function register() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/dev/webhooks", { method: "POST" });
      const body = (await r.json()) as { secret?: string | null; error?: string; note?: string };
      if (!r.ok) setMsg(body.error ?? "Registration failed.");
      else {
        setSecret(body.secret ?? null);
        setMsg(body.note ?? "Registered.");
        setInfo(await load());
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>HeyGen endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted">Callback base: <span className="font-mono text-ink">{info ? (info.base ?? "not set (APP_BASE_URL must be public https)") : "…"}</span></p>
          <p className="text-muted">Events: {info?.heygenEvents.join(", ")}</p>
          {info?.endpointsError && <p className="text-danger">{info.endpointsError}</p>}
          <ul className="space-y-1">
            {info?.endpoints.map((e) => (
              <li key={e.endpoint_id} className="panel p-3 text-[13px]"><span className="font-mono">{e.url}</span> · {e.status} · {e.events?.length ?? "all"} events</li>
            ))}
            {info && info.endpoints.length === 0 && !info.endpointsError && <li className="text-muted">No endpoint registered yet.</li>}
          </ul>
          <Button type="button" variant="primary" onClick={register} disabled={busy || !info?.base}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Register our endpoint
          </Button>
          {secret && (
            <div className="rounded-[14px] border border-success/30 bg-success/5 p-3">
              <p className="font-medium">Secret (shown once):</p>
              <code className="block select-all break-all font-mono text-[13px]">{secret}</code>
            </div>
          )}
          {msg && <p role="status" className="text-muted">{msg}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Received events</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-[13px]">
            {info?.events.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-divider py-1.5"><span>{e.provider} · {e.eventType} · <span className="font-mono">{e.externalId}</span></span><span className="text-muted">{formatDate(e.receivedAt)}</span></li>
            ))}
            {info && info.events.length === 0 && <li className="text-muted">Nothing received yet. Test with a signed POST to /api/webhooks/heygen (see src/lib/webhooks/incoming.test.ts).</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
