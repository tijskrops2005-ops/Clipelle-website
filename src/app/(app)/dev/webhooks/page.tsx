import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { WebhooksPanel } from "./WebhooksPanel";

export const metadata: Metadata = { title: "Provider webhooks" };

/** Developer-only: incoming provider webhooks (registration, received events). 404 outside development. */
export default function DevWebhooksPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Provider webhooks"
        badge={<Badge>Free · listing and registration only</Badge>}
        description="Incoming webhooks wake a waiting job early; polling stays the fallback. HeyGen needs a registered endpoint (secret shown once, goes into HEYGEN_WEBHOOK_SECRET); fal.ai and Shotstack get a callback URL per job when APP_BASE_URL is a public https URL. Below: the registered HeyGen endpoints and the last received events."
      />
      <WebhooksPanel />
    </div>
  );
}
