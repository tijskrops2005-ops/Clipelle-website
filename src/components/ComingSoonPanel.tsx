"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Languages } from "lucide-react";
import { addNotifyWish, getNotifyWishes } from "@/lib/data/settingsClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/**
 * What a customer sees on a tool that is announced but switched off (27 Oct 2026: the two ad tools
 * while `config.features.ads` is off). "Notify me" stores a wish, the same way Settings → Connections
 * does; the main button sends them to the tool that works today.
 */
export function ComingSoonPanel({ feature, title, text, points }: { feature: string; title: string; text: string; points: string[] }) {
  const [wished, setWished] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    getNotifyWishes().then((w) => alive && setWished(w)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const done = wished.includes(feature);
  async function notify() {
    setWished((w) => (w.includes(feature) ? w : [...w, feature]));
    await addNotifyWish(feature).catch(() => {});
  }
  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8" aria-labelledby="coming-soon-title">
      <Badge tone="warning">Coming soon</Badge>
      <h2 id="coming-soon-title" className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{text}</p>
      <ul className="mt-5 grid gap-2 text-[14px] text-ink/85 sm:grid-cols-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{p}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button href="/new/translate" variant="accent" size="lg"><Languages className="size-5" aria-hidden /> Translate a video instead</Button>
        <Button type="button" variant={done ? "secondary" : "primary"} size="lg" onClick={notify} disabled={done}>
          {done ? <Check className="size-4" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
          {done ? "We will let you know" : "Notify me when it is ready"}
        </Button>
      </div>
    </section>
  );
}
