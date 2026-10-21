"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Link2, Loader2, MoreHorizontal, Pencil, Tag, X } from "lucide-react";
import { config } from "@/lib/config";
import type { Project } from "@/lib/types";
import { createShareLink, listShareLinks, revokeShareLink, updateProjectMeta, type ShareLinkInfo } from "@/lib/data/client";
import { languageOf } from "@/lib/languages";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

/**
 * Organise one project from its page: rename, tags, archive, duplicate (a new version of an ad)
 * and public viewing links. Nothing here touches the run or the files.
 */
export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "rename" | "tags" | "share">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState(project.name);
  const [tags, setTags] = useState((project.tags ?? []).join(", "));

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(open === "rename" ? null : "rename")}>
          <Pencil className="size-4" aria-hidden />
          Rename
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(open === "tags" ? null : "tags")}>
          <Tag className="size-4" aria-hidden />
          Tags{project.tags?.length ? ` (${project.tags.length})` : ""}
        </Button>
        {project.workflow === "ad" && (
          <Button href={`/new/ad?from=${project.id}`} variant="ghost" size="sm">
            <Copy className="size-4" aria-hidden />
            Duplicate
          </Button>
        )}
        {project.status === "completed" && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(open === "share" ? null : "share")}>
            <Link2 className="size-4" aria-hidden />
            Share link
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await updateProjectMeta(project.id, { archived: !project.archivedAt });
              if (!project.archivedAt) router.push("/projects");
            }, project.archivedAt ? "Back in your lists." : undefined)
          }
        >
          {project.archivedAt ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
          {project.archivedAt ? "Unarchive" : "Archive"}
        </Button>
        <MoreHorizontal className="size-4 text-muted" aria-hidden />
      </div>
      {msg && <p role="status" className="text-[13px] text-muted">{msg}</p>}

      {open === "rename" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await updateProjectMeta(project.id, { name });
              setOpen(null);
            }, "Renamed.");
          }}
        >
          <Field id="renameProject" label="Name" className="min-w-64 flex-1">
            <Input id="renameProject" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          </Field>
          <Button type="submit" variant="primary" size="sm" disabled={busy || name.trim().length < 2}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}Save</Button>
        </form>
      )}
      {open === "tags" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await updateProjectMeta(project.id, { tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
              setOpen(null);
            }, "Tags saved.");
          }}
        >
          <Field id="projectTags" label="Tags" hint="Comma-separated, up to 10. Used by the search on Projects." className="min-w-64 flex-1">
            <Input id="projectTags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="spring, bestseller, tiktok" autoFocus />
          </Field>
          <Button type="submit" variant="primary" size="sm" disabled={busy}>Save</Button>
        </form>
      )}
      {open === "share" && <SharePanel project={project} onClose={() => setOpen(null)} />}
    </div>
  );
}

function SharePanel({ project, onClose }: { project: Project; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLinkInfo[]>([]);
  const [days, setDays] = useState(14);
  const [allowDownload, setAllowDownload] = useState(false);
  const [language, setLanguage] = useState(project.workflow === "translate" ? project.targetLanguages[0] : undefined);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    setLinks(await listShareLinks(project.id));
  }
  useEffect(() => {
    listShareLinks(project.id).then(setLinks).catch(() => {});
  }, [project.id]);

  async function create() {
    setBusy(true);
    setMsg(null);
    try {
      const made = await createShareLink(project.id, { expiresInDays: days, allowDownload, language });
      setFresh(made.url);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not make the link.");
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeShareLink(project.id, id);
      await reload();
      setMsg("Link withdrawn. It stops working at once.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not withdraw the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-3 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">Viewing link for approval</p>
          <p className="text-[13px] text-muted">A public, read-only page with this video and its name, nothing else. Not indexed by search engines. Expires on the date you choose and can be withdrawn here.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="focus-ring rounded-full p-1 text-muted hover:text-ink"><X className="size-4" aria-hidden /></button>
      </div>
      {config.demoMode ? (
        <p className="text-[13px] text-muted">Demo mode: links need a real finished video, so this is available in database mode only.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Field id="shareDays" label="Valid for">
            <select id="shareDays" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 rounded-control border border-border bg-surface px-3 text-sm">
              {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}
            </select>
          </Field>
          {project.workflow === "translate" && (
            <Field id="shareLanguage" label="Language version">
              <select id="shareLanguage" value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 rounded-control border border-border bg-surface px-3 text-sm">
                {project.targetLanguages.map((l) => <option key={l} value={l}>{languageOf(l).label}</option>)}
              </select>
            </Field>
          )}
          <label className="flex h-10 items-center gap-2 text-sm text-ink"><input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="size-4" />Allow download</label>
          <Button type="button" variant="primary" size="sm" onClick={create} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />}Make link</Button>
        </div>
      )}
      {fresh && (
        <div role="status" className="rounded-[12px] border border-success/30 bg-success/5 p-3">
          <p className="text-[13px] font-medium text-ink">Copy the link now; it is shown once.</p>
          <code className="mt-1 block select-all break-all font-mono text-[12px] text-ink">{fresh}</code>
        </div>
      )}
      {msg && <p role="status" className="text-[13px] text-muted">{msg}</p>}
      {links.length > 0 && (
        <ul className="space-y-1 text-[13px]">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-1.5">
              <span className="text-muted">{l.active ? "Active" : l.revokedAt ? "Withdrawn" : "Expired"} · until {formatDate(l.expiresAt)}{l.language ? ` · ${languageOf(l.language).tag}` : ""}{l.allowDownload ? " · download allowed" : ""} · {l.views} {l.views === 1 ? "view" : "views"}</span>
              {l.active && <Button type="button" variant="ghost" size="sm" onClick={() => revoke(l.id)} disabled={busy}>Withdraw</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
