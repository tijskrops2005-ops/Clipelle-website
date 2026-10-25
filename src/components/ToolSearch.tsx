"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Film, Search, X } from "lucide-react";
import { useProjects } from "@/lib/data/client";
import { cn } from "@/lib/utils";
import { OPEN_TOOLS_EVENT, SOON_TOOLS, STUDIO_TOOLS, type Tool } from "@/components/tools";

/**
 * "All tools" and search in one dialog (⌘K / Ctrl+K, the sidebar item, the top bar): the studio
 * tools, what is announced as soon, and the projects that match what you type. Enter opens the
 * first match; arrows move; Escape closes and returns focus.
 */
export function ToolSearch() {
  const router = useRouter();
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      returnTo.current = document.activeElement as HTMLElement | null;
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_TOOLS_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_TOOLS_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const needle = q.trim().toLowerCase();
  const tools = useMemo(() => [...STUDIO_TOOLS, ...SOON_TOOLS].filter((t) => !needle || `${t.label} ${t.text}`.toLowerCase().includes(needle)), [needle]);
  const found = useMemo(
    () =>
      needle
        ? projects.filter((p) => `${p.name} ${p.workflow === "ad" ? p.productName : ""}`.toLowerCase().includes(needle)).slice(0, 5)
        : [],
    [needle, projects],
  );
  const studio = tools.filter((t) => !t.soon);
  const soon = tools.filter((t) => t.soon);
  // Same order as on screen (studio tools, matching projects, soon), so arrows and Enter follow what is seen.
  const results: string[] = [...studio.map((t) => t.href), ...found.map((p) => `/projects/${p.id}`), ...soon.map((t) => t.href)];

  function close() {
    setOpen(false);
    returnTo.current?.focus?.();
  }
  function go(href: string) {
    setOpen(false);
    router.push(href);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  if (!open) return null;
  // Positions in `results`: studio tools first, then matching projects, then soon.
  const projectOffset = studio.length;
  const soonOffset = studio.length + found.length;
  const tile = (t: Tool, i: number) => {
    const Icon = t.icon;
    return (
      <li key={t.key}>
        <Link
          href={t.href}
          onClick={() => setOpen(false)}
          onMouseEnter={() => setActive(i)}
          className={cn("focus-ring flex h-full flex-col gap-3 rounded-panel border p-4 transition-[background-color,border-color] duration-150", i === active ? "border-ink/15 bg-surface-muted" : "border-border bg-surface hover:bg-surface-muted")}
        >
          <span className="flex items-start justify-between gap-2">
            <span className={cn("grid size-9 place-items-center rounded-[10px]", t.soon ? "bg-ink-soft text-muted" : "bg-accent-soft text-accent")}><Icon className="size-[18px]" aria-hidden /></span>
            {t.soon && <span className="label-mono rounded-full border border-border px-2 py-1 text-[10px] text-muted">Soon</span>}
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-ink">{t.label}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t.text}</span>
          </span>
        </Link>
      </li>
    );
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 pb-10 pt-[10vh]" role="presentation" onKeyDown={onKeyDown}>
      <button type="button" aria-label="Close" onClick={close} className="fixed inset-0 bg-ink/30 backdrop-blur-[3px]" />
      <div role="dialog" aria-modal="true" aria-label="All tools" className="rise relative w-full max-w-3xl rounded-card bg-surface p-5 shadow-card-hover sm:p-6">
        <div className="flex items-center gap-3 rounded-control border border-border bg-bg px-3">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Search tools and projects…"
            aria-label="Search tools and projects"
            className="h-11 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="label-mono hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:block">Esc</kbd>
          <button type="button" onClick={close} aria-label="Close" className="focus-ring grid size-8 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink sm:hidden">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {studio.length > 0 && (
          <>
            <p className="label-mono mb-2 mt-5 text-muted">Studio tools</p>
            <ul className="grid gap-2 sm:grid-cols-2">{studio.map((t, n) => tile(t, n))}</ul>
          </>
        )}
        {found.length > 0 && (
          <>
            <p className="label-mono mb-2 mt-5 text-muted">Projects</p>
            <ul className="space-y-1">
              {found.map((p, n) => {
                const i = projectOffset + n;
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} onClick={() => setOpen(false)} onMouseEnter={() => setActive(i)} className={cn("focus-ring flex items-center gap-3 rounded-control px-3 py-2.5 text-[14px] text-ink", i === active ? "bg-surface-muted" : "hover:bg-surface-muted")}>
                      <Film className="size-4 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <ArrowRight className="size-4 text-muted" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {soon.length > 0 && (
          <>
            <p className="label-mono mb-2 mt-5 text-muted">Coming soon</p>
            <ul className="grid gap-2 sm:grid-cols-3">{soon.map((t, n) => tile(t, soonOffset + n))}</ul>
          </>
        )}
        {tools.length === 0 && found.length === 0 && <p className="py-10 text-center text-[14px] text-muted">Nothing matches “{q}”. Try a tool name or a project name.</p>}
      </div>
    </div>
  );
}
