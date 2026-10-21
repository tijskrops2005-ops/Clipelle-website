"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, RefreshCw, Trash2, Webhook } from "lucide-react";
import { config } from "@/lib/config";
import { createWebhookEndpoint, deleteWebhookEndpoint, getWebhooks, retryWebhookDelivery, type WebhooksInfo } from "@/lib/data/settingsClient";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Settings → API keys → Webhooks: endpoints per workspace, secret shown once, last deliveries with Retry. */
export function WebhooksSettings() {
  const [info, setInfo] = useState<WebhooksInfo | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["project.completed", "project.failed"]);
  const [fresh, setFresh] = useState<{ id: string; secret: string; url: string } | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setInfo(await getWebhooks());
  }
  useEffect(() => {
    getWebhooks().then(setInfo).catch((e: Error) => setMsg({ tone: "error", text: e.message }));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy("create");
    setMsg(null);
    setFresh(null);
    try {
      const made = await createWebhookEndpoint(url.trim(), events);
      setFresh({ id: made.id, secret: made.secret, url: made.url });
      setUrl("");
      await refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not add the endpoint." });
    } finally {
      setBusy(null);
    }
  }
  async function onDelete(id: string) {
    setBusy(id);
    try {
      await deleteWebhookEndpoint(id);
      if (fresh?.id === id) setFresh(null);
      await refresh();
      setMsg({ tone: "ok", text: "Endpoint removed. Pending deliveries to it are dropped." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not remove the endpoint." });
    } finally {
      setBusy(null);
    }
  }
  async function onRetry(id: string) {
    setBusy(id);
    try {
      await retryWebhookDelivery(id);
      await refresh();
      setMsg({ tone: "ok", text: "Sent again. The result appears here within a minute." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not retry." });
    } finally {
      setBusy(null);
    }
  }

  const canManage = Boolean(info?.allowed) && info?.role === "owner" && !config.demoMode;

  return (
    <>
      <SectionCard
        title="Webhooks"
        description="We call your URL when a project finishes or fails, with the project exactly as the API returns it and a signature you can check. Retries with backoff for about a day; a delivery can be sent again here."
        aside={<DemoBadge>Demo: no webhooks</DemoBadge>}
      >
        {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{msg.text}</p>}
        {info && !info.allowed && !config.demoMode && <p className="text-[13px] text-muted">Webhooks come with the API on paid plans. Pick a plan in Billing.</p>}
        {info?.role !== "owner" && info && <p className="text-[13px] text-muted">Only the workspace owner manages webhooks for a team.</p>}
        {canManage && (
          <form onSubmit={onCreate} className="space-y-3">
            <Field id="webhookUrl" label="Endpoint URL" hint="A public https:// URL on your server. Private addresses and plain http are refused.">
              <Input id="webhookUrl" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourshop.com/reelay/webhook" required />
            </Field>
            <fieldset className="flex flex-wrap gap-3">
              <legend className="mb-1 text-sm font-medium text-ink">Events</legend>
              {(info?.events ?? []).map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents((cur) => (e.target.checked ? [...cur, ev] : cur.filter((x) => x !== ev)))} className="size-4" />
                  <span className="font-mono text-[13px]">{ev}</span>
                </label>
              ))}
            </fieldset>
            <Button type="submit" variant="primary" disabled={busy !== null || events.length === 0}>
              {busy === "create" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Webhook className="size-4" aria-hidden />}
              Add endpoint
            </Button>
          </form>
        )}
        {fresh && (
          <div role="status" className="rounded-[14px] border border-success/30 bg-success/5 p-4">
            <p className="text-sm font-semibold text-ink">Copy the signing secret now. It is shown once.</p>
            <code className="mt-2 block select-all overflow-x-auto rounded-control bg-surface px-3 py-2 font-mono text-[13px] text-ink">{fresh.secret}</code>
            <p className="mt-2 text-[13px] text-muted">Every call to {fresh.url} carries <span className="font-mono">X-Reelay-Signature: t=…,v1=…</span>; v1 is the HMAC-SHA256 of &quot;t.body&quot; with this secret. The API docs show the check.</p>
          </div>
        )}
        <ul className="space-y-2">
          {info?.endpoints.map((e) => (
            <li key={e.id} className="panel flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] text-ink">{e.url}</p>
                <p className="text-[13px] text-muted">{e.events.join(", ")} · added {formatDate(e.createdAt)}{e.lastDeliveryAt ? ` · last delivery ${formatDate(e.lastDeliveryAt)} (${e.lastStatus})` : " · nothing sent yet"}</p>
              </div>
              {canManage && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(e.id)} disabled={busy !== null}>
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </li>
          ))}
          {info && info.endpoints.length === 0 && <li className="text-[13px] text-muted">No endpoints yet.</li>}
        </ul>
      </SectionCard>

      <SectionCard title="Recent deliveries" description="The last 30 calls to your endpoints, newest first.">
        <ul className="space-y-1.5">
          {info?.deliveries.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-divider py-2 text-[13px]">
              <span className="min-w-0">
                <Badge tone={d.status === "delivered" ? "success" : d.status === "failed" ? "danger" : "warning"}>{d.status}</Badge>
                <span className="ml-2 font-mono">{d.event}</span>
                <span className="ml-2 text-muted">attempt {d.attempt}{d.responseStatus ? ` · ${d.responseStatus}` : ""}{d.error ? ` · ${d.error}` : ""} · {formatDate(d.createdAt)}</span>
              </span>
              {canManage && d.status !== "pending" && (
                <Button type="button" variant="secondary" size="sm" onClick={() => onRetry(d.id)} disabled={busy !== null}>
                  <RefreshCw className="size-4" aria-hidden />
                  Retry
                </Button>
              )}
            </li>
          ))}
          {info && info.deliveries.length === 0 && <li className="text-[13px] text-muted">No deliveries yet.</li>}
        </ul>
      </SectionCard>
    </>
  );
}
