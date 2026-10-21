"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { changePassword, deleteAccount, getProfile, saveNotifyEmail, saveProfileName, type ProfileInfo } from "@/lib/data/settingsClient";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";
import { DemoBadge } from "@/components/DemoModeBadge";

export function ProfileSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setName(p.name);
      })
      .catch((e: Error) => alive && setMsg({ tone: "error", text: e.message }));
    return () => {
      alive = false;
    };
  }, []);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "ok", text: ok });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  function onName(e: FormEvent) {
    e.preventDefault();
    void run("name", () => saveProfileName(name.trim()), "Name saved.").then(() => router.refresh());
  }
  function onPassword(e: FormEvent) {
    e.preventDefault();
    void run("password", async () => {
      await changePassword(password);
      setPassword("");
    }, "Password changed.");
  }
  function onDelete(e: FormEvent) {
    e.preventDefault();
    void run("delete", async () => {
      await deleteAccount(confirm);
      router.push("/");
      router.refresh();
    }, "Account deleted.");
  }

  return (
    <>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger" : "rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink"}>
          {msg.text}
        </p>
      )}
      <SectionCard title="Profile" description="How we address you and where we send e-mail." aside={<DemoBadge>Demo user</DemoBadge>}>
        <form onSubmit={onName} className="space-y-5">
          <Field id="email" label="E-mail" hint={profile?.emailVerified ? "Verified." : "Not verified yet: open the link we sent you."}>
            <div className="flex items-center gap-3">
              <Input id="email" value={profile?.email ?? ""} readOnly className="bg-surface-muted" />
              <Badge tone={profile?.emailVerified ? "success" : "warning"}>{profile?.emailVerified ? "Verified" : "Unverified"}</Badge>
            </div>
          </Field>
          <Field id="name" label="Name" optional>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
          </Field>
          <Button type="submit" variant="primary" disabled={busy !== null}>
            {busy === "name" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save name
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Notifications" description="One short e-mail per video or batch when it is ready or stops, with a link. Nothing else is ever sent to this address.">
        <label className="flex cursor-pointer items-start gap-3 rounded-panel border border-border bg-surface-muted/60 p-4 text-sm text-ink transition-colors duration-150 hover:bg-surface">
          <input
            type="checkbox"
            checked={profile?.notifyEmail ?? true}
            disabled={!profile || busy === "notify"}
            onChange={(e) => {
              const on = e.target.checked;
              setProfile((p) => (p ? { ...p, notifyEmail: on } : p));
              void run("notify", () => saveNotifyEmail(on), on ? "You will get an e-mail when a video is ready or stops." : "E-mail notifications are off. The app still shows a badge and a message.");
            }}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="font-medium">E-mail me when a video is ready or fails</span>
            <span className="block text-[13px] leading-relaxed text-muted">Sent to {profile?.email ?? "your address"}. Variations in a batch send one e-mail for the whole batch.</span>
          </span>
        </label>
      </SectionCard>

      <SectionCard title="Password" description={config.demoMode ? "Demo mode has no accounts, so there is no password." : "Choose a new password for this account."}>
        <form onSubmit={onPassword} className="space-y-5">
          <Field id="password" label="New password" hint="At least 8 characters.">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" disabled={config.demoMode} />
          </Field>
          <Button type="submit" variant="primary" disabled={busy !== null || config.demoMode || password.length < 8}>
            {busy === "password" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Change password
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Delete account" description="Removes your projects, files, credits and sign-in. This cannot be undone.">
        <form onSubmit={onDelete} className="space-y-5">
          <Field id="confirm" label="Type your e-mail address to confirm">
            <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" disabled={config.demoMode} />
          </Field>
          <Button type="submit" variant="danger" disabled={busy !== null || config.demoMode || !confirm}>
            {busy === "delete" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Delete my account
          </Button>
        </form>
      </SectionCard>
    </>
  );
}
