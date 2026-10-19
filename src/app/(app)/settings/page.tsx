import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { KeyRound, Settings2, UserRound } from "lucide-react";
import { config } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <CardTitle>Coming later</CardTitle>
          <DemoBadge>Placeholder</DemoBadge>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <StorageCard />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>About this build</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            <span className="font-medium text-ink">{config.productName}</span> is a working name and is easy to change.
          </p>
          <p>
            Demo mode is {config.demoMode ? "on" : "off"}: all projects and videos are simulated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
