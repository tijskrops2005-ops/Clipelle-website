"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

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
  }, [fetchStatus]);

  function refresh() {
    setLoading(true);
    void fetchStatus().finally(() => setLoading(false));
  }

  return (
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
  );
}
