"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, ShoppingBag, Share2 } from "lucide-react";
import { addNotifyWish, getNotifyWishes } from "@/lib/data/settingsClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";

const connections = [
  { key: "publish_tiktok", title: "Publish to TikTok", text: "Post a finished ad straight from the project page.", icon: Share2 },
  { key: "publish_instagram", title: "Publish to Instagram Reels", text: "Post a finished ad straight from the project page.", icon: Share2 },
  { key: "publish_youtube", title: "Publish to YouTube Shorts", text: "Post a finished ad straight from the project page.", icon: Share2 },
  { key: "shopify_import", title: "Import from Shopify", text: "Pick a product and let its name, description and photos fill the form.", icon: ShoppingBag },
];

/** Future connections. "Notify me" only stores a wish; nothing connects or publishes yet. */
export function ConnectionsSettings() {
  const [wished, setWished] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    getNotifyWishes().then((w) => alive && setWished(w)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  async function notify(key: string) {
    setWished((w) => (w.includes(key) ? w : [...w, key]));
    await addNotifyWish(key).catch(() => {});
  }
  return (
    <SectionCard title="Connections" description="Where your videos could go next. Nothing here connects or publishes yet; tell us what you want first.">
      <ul className="grid gap-4 md:grid-cols-2">
        {connections.map(({ key, title, text, icon: Icon }) => {
          const done = wished.includes(key);
          return (
            <li key={key} className="flex flex-col rounded-panel border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-surface-muted text-ink"><Icon className="size-[18px]" aria-hidden /></span>
                <Badge tone="warning">Coming soon</Badge>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{text}</p>
              <Button type="button" variant={done ? "secondary" : "primary"} size="sm" className="mt-4 w-fit" onClick={() => notify(key)} disabled={done}>
                {done ? <Check className="size-4" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
                {done ? "We will let you know" : "Notify me"}
              </Button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
