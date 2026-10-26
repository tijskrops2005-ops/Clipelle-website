"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { listPresenters } from "@/lib/data/client";
import type { Presenter } from "@/lib/types";
import type { PresenterEngine } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DemoBadge } from "@/components/DemoModeBadge";
import { Poster } from "@/components/Poster";

type Gender = "all" | "female" | "male";

/**
 * The customer's presenter choice on /new/ad: portrait looks that support the chosen quality,
 * a gender filter, 12 per page with "More presenters". Nothing picked = the default look.
 * Provider, engine and ids never appear as text.
 */
export function PresenterPicker({
  engine,
  value,
  onChange,
  disabled,
}: {
  engine: PresenterEngine;
  /** Chosen look id, or undefined for the default. */
  value: string | undefined;
  onChange: (lookId: string | undefined, presenter?: Presenter) => void;
  disabled?: boolean;
}) {
  const [gender, setGender] = useState<Gender>("all");
  const [items, setItems] = useState<Presenter[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The pick we keep across reloads, so a quality switch can check whether it is still supported. */
  const [picked, setPicked] = useState<Presenter | null>(null);

  // Reload the first page whenever quality or gender changes.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        return listPresenters({ engine, gender: gender === "all" ? undefined : gender, page: 0 });
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPage(0);
        setHasMore(res.hasMore);
        setDefaultId(res.defaultId);
        // Tell the form which presenter is in effect (the default when nothing is picked), for the voice filter.
        const effective = res.items.find((p) => p.id === (value ?? res.defaultId));
        if (effective) onChange(value, effective);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on the filters only; value/onChange are read at that moment
  }, [engine, gender]);

  // Quality switched: a pick that does not support the new quality falls back to the default, and we say so.
  useEffect(() => {
    if (!picked || picked.engines.includes(engine)) return;
    const unsupported = picked;
    queueMicrotask(() => {
      const defaultName = items.find((p) => p.id === defaultId)?.name;
      setNotice(`${unsupported.name} is not available in this quality, so we switched back to ${defaultName ?? "the default presenter"}.`);
      setPicked(null);
      onChange(undefined, items.find((p) => p.id === defaultId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the quality switch only
  }, [engine]);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await listPresenters({ engine, gender: gender === "all" ? undefined : gender, page: page + 1 });
      setItems((prev) => [...prev, ...res.items.filter((p) => !prev.some((x) => x.id === p.id))]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedId = value ?? defaultId;
  const names = displayNames(items);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Filter presenters"
          size="sm"
          options={[
            { key: "all", label: "All" },
            { key: "female", label: "Women" },
            { key: "male", label: "Men" },
          ]}
          value={gender}
          onChange={setGender}
          disabled={disabled}
        />
        <DemoBadge>Demo presenters</DemoBadge>
      </div>

      {notice && (
        <p role="status" className="rounded-[10px] bg-warning/10 px-3 py-2 text-[13px] text-ink">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          Could not load presenters: {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {items.map((p) => {
          const selected = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                setNotice(null);
                setPicked(p);
                onChange(p.id === defaultId ? undefined : p.id, p);
              }}
              className={cn(
                "focus-ring group relative overflow-hidden rounded-tile bg-surface-muted text-left transition-[box-shadow,transform] duration-150",
                selected ? "ring-2 ring-accent" : "hover:-translate-y-px hover:shadow-card",
              )}
            >
              <div className="relative aspect-[3/4]">
                {p.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview photo from the presenter catalogue
                  <img src={p.previewUrl} alt={p.name} className="size-full object-cover" loading="lazy" />
                ) : (
                  <Poster seed={p.id} monogram={p.name[0]} />
                )}
              </div>
              <p className="truncate px-2 py-1.5 text-xs font-medium text-ink" title={p.name}>{names.get(p.id) ?? p.name}</p>
              {p.id === defaultId && <span className="absolute left-1.5 top-1.5 rounded-full bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-ink shadow-soft">Default</span>}
              {selected && (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-white">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
        {loading && items.length === 0 && Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-tile bg-surface-muted" />)}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{items.length === 0 && !loading ? "No presenters match this filter." : "The voice, script and captions follow the presenter you pick."}</p>
        {hasMore && (
          <Button type="button" variant="secondary" size="sm" onClick={loadMore} disabled={loading || disabled}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Show all presenters
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Tidy names for the tiles (26 Oct 2026): trailing initials from the catalogue ("Teodora P L") are
 * dropped, and two looks of the same person are numbered ("Teodora", "Teodora 2").
 */
function displayNames(items: Presenter[]) {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const p of items) {
    const base = p.name.replace(/(\s+[A-Z]\.?)+$/, "").trim() || p.name;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(p.id, n === 1 ? base : `${base} ${n}`);
  }
  return out;
}
