import type { Metadata } from "next";
import { KeyRound, Settings2, UserRound } from "lucide-react";
import { config } from "@/lib/config";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

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
    text: "Status of the Vmake, HeyGen and VEED connections. Keys stay on the server, never in the browser.",
  },
  {
    icon: Settings2,
    title: "Defaults",
    text: "Preferred language and video length, once the services confirm what they support.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-display text-ink">Settings</h1>
        <p className="text-[17px] text-muted">
          Nothing to configure yet. This page fills up as the real services are connected.
        </p>
      </header>

      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <CardTitle>Coming later</CardTitle>
          <Badge tone="warning">Placeholder</Badge>
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
