import { config } from "@/lib/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description={config.features.ads ? "Your account, brand defaults, usage, billing and connections." : "Your account, usage, billing and connections."} />
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
