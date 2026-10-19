"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Security = {
  ok: boolean;
  rls: { table: string; enabled: boolean }[];
  grants: string[];
  probes: { name: string; status: number; refused: boolean; detail: string }[];
  checkedAt: string;
};

type Status = {
  ok: boolean;
  latencyMs: number;
  postgres: string;
  tables: { table_name: string; rows: number }[];
  migrations: { id: number; hash: string; createdAt: string }[];
  env: Record<string, boolean>;
};

export function DbStatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [security, setSecurity] = useState<Security | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  /** Fetches without touching state synchronously, so the effect below stays lint-clean. */
  const fetchStatus = useCallback(() => {
    return fetch("/api/dev/db")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        return b as Status;
      })
      .then((s) => {
        setStatus(s);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void fetchStatus();
    fetch("/api/dev/db/security")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        return b as Security;
      })
      .then((sec) => setSecurity(sec))
      .catch((e: Error) => setSecurityError(e.message));
  }, [fetchStatus]);

  function refresh() {
    setLoading(true);
    void fetchStatus().finally(() => setLoading(false));
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Security check</CardTitle>
        {security && <Badge tone={security.ok ? "success" : "danger"}>{security.ok ? "all checks passed" : "attention needed"}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {securityError && <p role="alert" className="text-danger">{securityError}</p>}
        {!security && !securityError && <Skeleton className="h-24" />}
        {security && (
          <>
            <p className="text-muted">
              Run live just now ({new Date(security.checkedAt).toLocaleTimeString()}): row-level security per table, grants for the Data API roles, and real requests with the publishable key.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="label-mono mb-2 text-muted">Row-level security</p>
                <ul className="space-y-1">
                  {security.rls.map((r) => (
                    <li key={r.table} className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[12px] text-ink">{r.table}</span>
                      <Badge tone={r.enabled ? "success" : "danger"}>{r.enabled ? "enabled" : "OFF"}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="label-mono mb-2 mt-4 text-muted">Grants to anon / authenticated</p>
                {security.grants.length === 0 ? <Badge tone="success">none</Badge> : <ul className="space-y-1 text-danger">{security.grants.map((g) => <li key={g}>{g}</li>)}</ul>}
              </div>
              <div>
                <p className="label-mono mb-2 text-muted">Requests with the publishable key</p>
                <ul className="space-y-1">
                  {security.probes.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[12px] text-ink" title={p.detail}>{p.name} · {p.status}</span>
                      <Badge tone={p.refused ? "success" : "danger"}>{p.refused ? "refused" : "ALLOWED"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Tables</CardTitle>
          <div className="flex items-center gap-3">
            {status && <Badge tone="success">connected · {status.latencyMs} ms</Badge>}
            <Button size="sm" variant="ghost" onClick={refresh} disabled={loading} aria-label="Refresh">
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : !status ? (
            <Skeleton className="h-40" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="label-mono text-left text-muted">
                  <th className="pb-2 font-normal">Table</th>
                  <th className="pb-2 text-right font-normal">Rows</th>
                </tr>
              </thead>
              <tbody>
                {status.tables.map((t) => (
                  <tr key={t.table_name} className="border-t border-divider">
                    <td className="py-2 font-mono text-[13px] text-ink">{t.table_name}</td>
                    <td className="py-2 text-right text-ink">{t.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {status && <p className="mt-4 text-[13px] text-muted">{status.postgres}</p>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {status
              ? Object.entries(status.env).map(([k, v]) => (
                  <p key={k} className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-[12px] text-ink">{k}</span>
                    <Badge tone={v ? "success" : "danger"}>{v ? "filled" : "empty"}</Badge>
                  </p>
                ))
              : !error && <Skeleton className="h-28" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Migrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {status?.migrations.length === 0 && <p className="text-muted">None applied yet. Run npm run db:migrate.</p>}
            {status?.migrations.map((m) => (
              <p key={m.id} className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12px] text-ink">#{m.id} · {m.hash}</span>
                <span className="label-mono text-muted">{new Date(Number(m.createdAt)).toISOString().slice(0, 16).replace("T", " ")}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
