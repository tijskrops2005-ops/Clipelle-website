"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { config } from "@/lib/config";
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyInfo } from "@/lib/data/settingsClient";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Settings → API keys: create (shown once), list with last use, revoke. Plans with credits only. */
export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ id: string; key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function refresh() {
    const r = await listApiKeys();
    setKeys(r.keys);
    setAllowed(r.allowed);
  }
  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch((e: Error) => setMsg({ tone: "error", text: e.message }))
      .finally(() => setLoaded(true));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy("create");
    setMsg(null);
    setFresh(null);
    try {
      const made = await createApiKey(name.trim() || "API key");
      setFresh({ id: made.id, key: made.key, name: made.name });
      setName("");
      await refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not create the key." });
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke(id: string) {
    setBusy(id);
    setMsg(null);
    try {
      await revokeApiKey(id);
      setFresh((f) => (f && f.id === id ? null : f)); // the one-time box belongs to a key that is now dead
      await refresh();
      setMsg({ tone: "ok", text: "Key revoked. Requests with it are refused from now on." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not revoke the key." });
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the key is still visible to select */
    }
  }

  const active = keys.filter((k) => !k.revokedAt);
  return (
    <div className="space-y-6">
      <SectionCard title="API keys" description="Make ads and translations from your own code. A key acts as you: same credits, same limits, same projects on your dashboard." aside={<DemoBadge>No keys in demo mode</DemoBadge>}>
        {config.demoMode ? (
          <p className="text-[15px] text-muted">Demo mode has no accounts and no database, so keys cannot be made here. In database mode this card creates keys for plans with credits.</p>
        ) : !loaded ? (
          <p className="text-[15px] text-muted">Loading…</p>
        ) : !allowed ? (
          <div className="rounded-[14px] bg-surface-muted p-4 text-[15px] text-ink">
            <p>API keys come with a plan that includes credits. The free plan uses its free credits on the forms, not through the API.</p>
            <Button href="/settings/billing" variant="primary" className="mt-3">Choose a plan</Button>
          </div>
        ) : (
          <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field id="keyName" label="Name" hint="Where the key is used, e.g. shop sync or Zapier." className="flex-1">
              <Input id="keyName" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Shop sync" />
            </Field>
            <Button type="submit" variant="primary" disabled={busy !== null}>
              {busy === "create" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
              Create key
            </Button>
          </form>
        )}
        {fresh && (
          <div role="status" className="mt-5 rounded-[14px] border border-success/30 bg-success/5 p-4">
            <p className="text-sm font-semibold text-ink">Copy your key now. It is shown once.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 select-all overflow-x-auto rounded-control bg-surface px-3 py-2 font-mono text-[13px] text-ink">{fresh.key}</code>
              <Button type="button" variant="secondary" size="sm" onClick={copy}>
                {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-2 text-[13px] text-muted">Send it as <code className="font-mono">Authorization: Bearer …</code>. See the <Link href="/docs/api" className="underline">API docs</Link>.</p>
          </div>
        )}
        {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "mt-4 text-[13px] text-danger" : "mt-4 text-[13px] text-success"}>{msg.text}</p>}
      </SectionCard>

      {!config.demoMode && loaded && (
        <SectionCard title="Your keys" description={active.length ? `${active.length} active. Revoke a key you no longer use.` : keys.length ? "No active keys." : "No keys yet."}>
          {keys.length > 0 && (
            <ul className="divide-y divide-divider">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                      {k.name}
                      {k.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}
                    </p>
                    <p className="text-[13px] text-muted"><span className="font-mono">{k.prefix}…</span> · created {formatDate(k.createdAt)} · {k.lastUsedAt ? `last used ${formatDate(k.lastUsedAt)}` : "never used"}</p>
                  </div>
                  {!k.revokedAt && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => onRevoke(k.id)} disabled={busy !== null}>
                      {busy === k.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
