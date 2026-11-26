"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { partners } from "@/content/partners";
import { addNotifyWish, getNotifyWishes } from "@/lib/data/settingsClient";
import { SectionCard } from "@/components/ui/SectionCard";
import { StepList } from "@/components/ui/StepList";
import { Button } from "@/components/ui/Button";

const FEATURE = "affiliate";

/**
 * The affiliate page in the app (26 Nov 2026, Tijs): the partner program's agreed rules (from
 * src/content/partners.ts, the one source) and the way in. With a sign-up link the button applies;
 * without one, "Notify me" stores a wish like the coming-soon tools do. No numbers that were not decided.
 */
export function AffiliatePanel() {
  const [wished, setWished] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    getNotifyWishes().then((w) => alive && setWished(w)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const done = wished.includes(FEATURE);
  async function notify() {
    setWished((w) => (w.includes(FEATURE) ? w : [...w, FEATURE]));
    await addNotifyWish(FEATURE).catch(() => {});
  }
  const open = Boolean(partners.signupUrl);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <SectionCard title={`Earn ${partners.commissionPercent}% of every subscription you bring in`} description="Recommend Clipelle to other sellers, agencies and creators. For every customer who subscribes through your link, you earn a share of what they pay, for as long as they stay.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Fact big={`${partners.commissionPercent}%`} label="of every subscription payment" />
            <Fact big="Lifetime" label="as long as the customer keeps a plan" />
            <Fact big={`$${partners.minimumPayoutUsd}`} label={`minimum, paid ${partners.payout}`} />
          </div>
          <p className="mt-5 text-[13.5px] text-muted">Credit packs bought separately do not count. Payouts run through {partners.platformName}, the partner platform that tracks your referrals.</p>
        </SectionCard>

        <SectionCard title="How it works">
          <StepList
            items={[
              { title: "Apply", text: open ? `Create your partner account on ${partners.platformName}.` : "Applications open soon. Leave your name and we tell you first." },
              { title: "Share your link", text: "Put it in a video, a post or an e-mail. Every sign-up through it is yours." },
              { title: "Get paid", text: `${partners.commissionPercent}% of each subscription payment, ${partners.payout}, from $${partners.minimumPayoutUsd}.` },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard title={open ? "Join" : "Opens soon"} className="self-start">
        <div className="flex flex-col gap-3">
          {open ? (
            <Button href={partners.signupUrl} variant="accent" size="lg" target="_blank" rel="noreferrer">Apply as a partner</Button>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-muted">We are setting up the partner platform. Leave your name and you hear it first.</p>
              <Button type="button" variant={done ? "secondary" : "primary"} size="lg" onClick={notify} disabled={done}>
                {done ? <><Check className="size-4" aria-hidden />We will let you know</> : "Notify me when it opens"}
              </Button>
            </>
          )}
          <Button href="/partners" variant="link" size="sm">Full partner terms</Button>
        </div>
      </SectionCard>
    </div>
  );
}

function Fact({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-[14px] bg-surface-muted p-4">
      <p className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{big}</p>
      <p className="mt-1 text-[13px] leading-snug text-muted">{label}</p>
    </div>
  );
}
