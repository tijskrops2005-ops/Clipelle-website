import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { KeyRound, Settings2, UserRound } from "lucide-react";
import { config } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionCard } from "@/components/ui/SectionCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemoBadge } from "@/components/DemoModeBadge";
import { StorageMeter } from "@/components/dev/StorageMeter";
import { getStorageUsage } from "@/lib/storage";

export const metadata: Metadata = { title: "Settings" };

const later = [
  {
    icon: UserRound,
    title: "Account",
    text: "Sign-in, your name and e-mail. Arrives together with authentication.",
  },
  {
    icon: KeyRound,
    title: "Connected services",
    text: "Status of the connections per step (script, product clip, presenter, final edit). Keys stay on the server, never in the browser.",
  },
  {
    icon: Settings2,
    title: "Defaults",
    text: "Preferred language and video length, once the services confirm what they support.",
  },
];

async function loadUsage() {
  try {
    return await getStorageUsage();
  } catch {
    return null; // storage not configured on this machine: nothing to show
  }
}

async function StorageCard() {
  await connection(); // live data: render at request time, inside the Suspense boundary below
  const usage = await loadUsage();
  if (!usage) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <p className="mt-1 text-[15px] text-muted">Uploads and finished videos live in our own storage. This is how much of the included space is used.</p>
      </CardHeader>
      <CardContent>
        <StorageMeter usage={usage} />
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Settings"
        description="Nothing to configure yet. This page fills up as the real services are connected."
      />

      <SectionCard title="Coming later" description="These settings arrive with authentication and the connected services. Nothing here can be changed yet." aside={<DemoBadge>Placeholder</DemoBadge>}>
        <ul className="divide-y divide-divider">
          {later.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-ink">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Suspense fallback={null}>
        <StorageCard />
      </Suspense>

      <SectionCard title="About this build" description="A few facts about the version you are looking at.">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="panel p-4">
            <dt className="label-mono text-muted">Product name</dt>
            <dd className="mt-1 text-ink">{config.productName} · a working name, easy to change</dd>
          </div>
          <div className="panel p-4">
            <dt className="label-mono text-muted">Demo mode</dt>
            <dd className="mt-1 text-ink">{config.demoMode ? "On: all projects and videos are simulated" : "Off: projects run on the real services"}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}
