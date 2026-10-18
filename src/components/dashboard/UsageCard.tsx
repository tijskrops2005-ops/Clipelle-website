import { Clock3 } from "lucide-react";
import { mockUsage } from "@/lib/mock/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Small usage summary. Numbers are simulated until Stage 8. */
export function UsageCard() {
  const { videosThisMonth, monthlyLimit, minutesSaved } = mockUsage;
  const percent = Math.min(100, Math.round((videosThisMonth / monthlyLimit) * 100));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-start justify-between gap-3">
        <CardTitle>This month</CardTitle>
        <DemoBadge>Demo numbers</DemoBadge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <div>
          <p className="text-display text-ink">
            {videosThisMonth}
            <span className="text-2xl font-medium text-muted">/{monthlyLimit}</span>
          </p>
          <p className="mt-1 text-sm text-muted">videos generated</p>
          <div
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={videosThisMonth}
            aria-valuemin={0}
            aria-valuemax={monthlyLimit}
          >
            <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] bg-surface-muted p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
            <Clock3 className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              About {Math.round(minutesSaved / 60)}h {minutesSaved % 60}m saved
            </p>
            <p className="text-[13px] text-muted">
              versus running the three tools by hand
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
