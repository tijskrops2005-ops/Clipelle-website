"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Copy, Loader2, LogOut, Mail, Trash2, UserPlus } from "lucide-react";
import { config } from "@/lib/config";
import { createWorkspace, deleteWorkspace, getTeam, inviteToWorkspace, leaveWorkspace, listWorkspaces, removeMember, renameWorkspace, revokeInvite, switchWorkspace, transferOwnership, type TeamInfo } from "@/lib/data/settingsClient";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Settings → Team: the current workspace's members, invitations, roles, per-member usage, create/leave/transfer/delete. */
export function TeamSettings() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [spaces, setSpaces] = useState<{ id: string; name: string; kind: string; role: string }[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function refresh() {
    const ws = await listWorkspaces();
    setSpaces(ws.workspaces);
    setCurrent(ws.current);
    setTeam(await getTeam(ws.current));
  }
  useEffect(() => {
    if (config.demoMode) {
      queueMicrotask(() => setLoaded(true));
      return;
    }
    Promise.resolve().then(refresh).catch((e: Error) => setMsg({ tone: "error", text: e.message })).finally(() => setLoaded(true));
  }, []);

  async function run(key: string, fn: () => Promise<void>, ok?: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      await refresh();
      if (ok) setMsg({ tone: "ok", text: ok });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await run("create", async () => {
      const ws = await createWorkspace(newName);
      await switchWorkspace(ws.id);
      setNewName("");
    }, "Team workspace created. Pick the Business plan in Billing to invite members.");
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!team) return;
    setFreshLink(null);
    await run("invite", async () => {
      const r = await inviteToWorkspace(team.workspace.id, inviteEmail);
      setInviteEmail("");
      if (!r.mailed) setFreshLink(r.link);
    }, "Invitation created.");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (config.demoMode) {
    return (
      <SectionCard title="Team" description="Workspaces and members need accounts and the database." aside={<DemoBadge>Demo mode</DemoBadge>}>
        <p className="text-[15px] text-muted">Demo mode runs as one demo user without a database. In database mode this page shows your workspaces, members, invitations and per-member usage.</p>
      </SectionCard>
    );
  }
  if (!loaded || !team) return <SectionCard title="Team" description="Loading…"><p className="text-[15px] text-muted">{msg?.text ?? "Loading…"}</p></SectionCard>;

  const isOwner = team.role === "owner";
  const isTeam = team.workspace.kind === "team";
  const teamPlan = team.workspace.planKey.startsWith("business");

  return (
    <div className="space-y-6">
      <SectionCard title={team.workspace.name} description={isTeam ? `Team workspace · ${teamPlan ? "Business plan" : "no team plan yet"} · ${team.balance.toLocaleString("en-US")} shared credits` : "Your personal workspace. Projects and credits here are yours alone."} aside={<Badge tone={isTeam ? "success" : "neutral"}>{isTeam ? "Team" : "Personal"}</Badge>}>
        {spaces.length > 1 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Switch workspace:</span>
            {spaces.map((w) => (
              <Button key={w.id} type="button" variant={w.id === current ? "primary" : "secondary"} size="sm" disabled={busy !== null || w.id === current} onClick={() => run(`switch-${w.id}`, () => switchWorkspace(w.id))}>
                {w.name}{w.kind === "team" ? " (team)" : ""}
              </Button>
            ))}
          </div>
        )}
        {isTeam && isOwner && (
          <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const name = (new FormData(form).get("name") as string) ?? ""; void run("rename", () => renameWorkspace(team.workspace.id, name), "Workspace renamed."); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field id="wsName" label="Workspace name" className="flex-1"><Input id="wsName" name="name" defaultValue={team.workspace.name} maxLength={60} /></Field>
            <Button type="submit" variant="secondary" disabled={busy !== null}>Rename</Button>
          </form>
        )}
        {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "mt-4 text-[13px] text-danger" : "mt-4 text-[13px] text-success"}>{msg.text}</p>}
      </SectionCard>

      {isTeam ? (
        <>
          <SectionCard title="Members" description={isOwner ? "Members make and see projects and use the shared credits. Usage this month per member." : "Everyone in this workspace. The owner manages the plan, credits and members."}>
            <ul className="divide-y divide-divider">
              {team.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[15px] font-medium text-ink">{m.name || m.email || m.userId.slice(0, 8)}<Badge tone={m.role === "owner" ? "success" : "neutral"}>{m.role === "owner" ? "Owner" : "Member"}</Badge></p>
                    <p className="text-[13px] text-muted">{m.email}{isOwner ? ` · ${m.usedThisMonth.toLocaleString("en-US")} credits used this month · ${m.projectsThisMonth} project${m.projectsThisMonth === 1 ? "" : "s"}` : ""} · joined {formatDate(m.createdAt)}</p>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => run(`transfer-${m.userId}`, () => transferOwnership(team.workspace.id, m.userId), "Ownership transferred.")}>Make owner</Button>
                      <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => run(`remove-${m.userId}`, () => removeMember(team.workspace.id, m.userId), "Member removed; their access ended.")}><Trash2 className="size-4" aria-hidden /> Remove</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>

          {isOwner && (
            <SectionCard title="Invite a member" description={teamPlan ? "An e-mail with a link, valid 7 days. When e-mail is not configured on this server, the link is shown here once to copy." : "Inviting members needs the Business plan on this workspace. Pick it in Billing first."}>
              <form onSubmit={onInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field id="inviteEmail" label="E-mail" className="flex-1"><Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required disabled={!teamPlan} /></Field>
                <Button type="submit" variant="primary" disabled={busy !== null || !teamPlan || !inviteEmail}>{busy === "invite" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />} Invite</Button>
              </form>
              {freshLink && (
                <div role="status" className="mt-4 rounded-[14px] border border-success/30 bg-success/5 p-4">
                  <p className="text-sm font-semibold text-ink">E-mail is not configured here: send this link yourself. It is shown once.</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 select-all overflow-x-auto rounded-control bg-surface px-3 py-2 font-mono text-[13px] text-ink">{freshLink}</code>
                    <Button type="button" variant="secondary" size="sm" onClick={() => copy(freshLink)}>{copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy"}</Button>
                  </div>
                </div>
              )}
              {team.invites.length > 0 && (
                <ul className="mt-5 divide-y divide-divider">
                  {team.invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <p className="flex items-center gap-2 text-[15px] text-ink"><Mail className="size-4 text-muted" aria-hidden />{i.email}<span className="text-[13px] text-muted">· expires {formatDate(i.expiresAt)}</span></p>
                      <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => run(`revoke-${i.id}`, () => revokeInvite(team.workspace.id, i.id), "Invitation revoked.")}>Revoke</Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {!isOwner && (
            <SectionCard title="Leave this workspace" description="You keep your personal workspace. Projects you made here stay with the team.">
              <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => run("leave", () => leaveWorkspace(team.workspace.id), "You left the workspace.")}><LogOut className="size-4" aria-hidden /> Leave</Button>
            </SectionCard>
          )}

          {isOwner && (
            <SectionCard title="Delete this workspace" description="Removes every project, file, credit and member of the team. This cannot be undone. Type the workspace name to confirm.">
              <form onSubmit={(e) => { e.preventDefault(); void run("delete", async () => { await deleteWorkspace(team.workspace.id, confirmName); }, "Workspace deleted."); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field id="confirmName" label={`Type "${team.workspace.name}"`} className="flex-1"><Input id="confirmName" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} /></Field>
                <Button type="submit" variant="danger" disabled={busy !== null || confirmName !== team.workspace.name}><Trash2 className="size-4" aria-hidden /> Delete workspace</Button>
              </form>
            </SectionCard>
          )}
        </>
      ) : (
        <SectionCard title="Create a team workspace" description="A shared space with its own credits, members and billing. No cost per seat; the Business plan is chosen afterwards in Billing.">
          <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field id="newWs" label="Team name" className="flex-1"><Input id="newWs" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme marketing" maxLength={60} required minLength={2} /></Field>
            <Button type="submit" variant="primary" disabled={busy !== null || newName.trim().length < 2}>{busy === "create" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Building2 className="size-4" aria-hidden />} Create team workspace</Button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
