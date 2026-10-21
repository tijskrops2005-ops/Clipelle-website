"use client";

import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";

/** Placeholder until Part 3 wires the payment provider. */
export function BillingSettings() {
  return (
    <SectionCard title="Billing" description="Plans and credit packs arrive here together with the payment provider.">
      <Button href="/pricing" variant="secondary">See plans</Button>
    </SectionCard>
  );
}
