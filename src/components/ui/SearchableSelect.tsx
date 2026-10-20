"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass, controlStateClass } from "@/components/ui/Field";

export type SelectOption = { value: string; label: string; hint?: string; group?: string; disabled?: boolean; disabledReason?: string };

/**
 * A select with a search box, for long lists (190 languages). Keyboard: type to filter,
 * arrows to move, Enter to pick, Escape to close. Options keep the order they are given in,
 * so "most used first, then alphabetical" is the caller's job.
 */
export function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  disabled,
  invalid,
  multiple,
  values,
  onToggle,
}: {
  id?: string;
  value?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Multi mode: picked values are shown as chips; clicking an option toggles it. */
  multiple?: boolean;
  values?: string[];
  onToggle?: (value: string) => void;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value);
  const picked = multiple ? options.filter((o) => values?.includes(o.value)) : [];

  function choose(o: SelectOption) {
    if (o.disabled) return;
    if (multiple) onToggle?.(o.value);
    else {
      onChange?.(o.value);
      setOpen(false);
    }
    setQuery("");
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(controlClass, controlStateClass(invalid), "flex min-h-11 items-center justify-between gap-2 py-1.5 text-left")}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {multiple ? (
            picked.length === 0 ? (
              <span className="text-muted/70">{placeholder}</span>
            ) : (
              picked.map((o) => (
                <span key={o.value} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-medium text-surface">
                  {o.label}
                  <span
                    role="button"
                    aria-label={`Remove ${o.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle?.(o.value);
                    }}
                    className="grid size-4 place-items-center rounded-full hover:bg-surface/20"
                  >
                    <X className="size-3" aria-hidden />
                  </span>
                </span>
              ))
            )
          ) : (
            <span className={cn("truncate", !current && "text-muted/70")}>{current?.label ?? placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-divider px-3">
            <Search className="size-4 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(filtered.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[active]) choose(filtered[active]);
                } else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Type to search"
              aria-label="Search"
              className="h-10 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
            />
          </div>
          <ul role="listbox" aria-multiselectable={multiple || undefined} className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">No match.</li>}
            {filtered.map((o, i) => {
              const selected = multiple ? values?.includes(o.value) : o.value === value;
              const groupStart = i === 0 ? o.group : filtered[i - 1].group !== o.group ? o.group : undefined;
              return (
                <li key={o.value}>
                  {groupStart && <p className="label-mono px-3 pb-1 pt-2 text-muted">{groupStart}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={o.disabled}
                    title={o.disabled ? o.disabledReason : undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm", i === active && "bg-surface-muted", o.disabled ? "text-muted/60" : "text-ink")}
                  >
                    <span>
                      {o.label}
                      {o.hint && <span className="ml-2 text-[12px] text-muted">{o.hint}</span>}
                    </span>
                    {selected && <Check className="size-4 text-accent" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
