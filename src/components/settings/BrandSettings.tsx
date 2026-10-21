"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { BRAND_COLORS, CAPTION_STYLES, CAPTION_STYLE_META, DEFAULT_ACCENT, DEFAULT_CAPTION_STYLE, DEFAULT_FONT, FONT_KEYS, FONT_META, HEX_COLOR, type CaptionStyle, type FontKey } from "@/lib/adOptions";
import { getBrandDefaults, saveBrandDefaults } from "@/lib/data/settingsClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, controlClass, controlStateClass } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Brand defaults: the ad form starts with these values; the form still sends exactly what you pick there. */
export function BrandSettings() {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [custom, setCustom] = useState("");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [font, setFont] = useState<FontKey>(DEFAULT_FONT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getBrandDefaults()
      .then((b) => {
        if (!alive) return;
        if (b.accent) {
          if (BRAND_COLORS.some((c) => c.value === b.accent)) setAccent(b.accent);
          else setCustom(b.accent);
        }
        if (b.captionStyle && (CAPTION_STYLES as readonly string[]).includes(b.captionStyle)) setCaptionStyle(b.captionStyle as CaptionStyle);
        if (b.font && (FONT_KEYS as readonly string[]).includes(b.font)) setFont(b.font as FontKey);
      })
      .catch((e: Error) => alive && setMsg({ tone: "error", text: e.message }))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const effective = HEX_COLOR.test(custom) ? custom.toUpperCase() : accent;
    try {
      await saveBrandDefaults({ accent: effective !== DEFAULT_ACCENT ? effective : undefined, captionStyle: captionStyle !== DEFAULT_CAPTION_STYLE ? captionStyle : undefined, font: font !== DEFAULT_FONT ? font : undefined });
      setMsg({ tone: "ok", text: "Brand defaults saved. New ads start with these values." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Brand defaults" description="Starting values for the brand style on the ad form. You can still change them per video; the logo is uploaded per video." aside={<DemoBadge>Stored in this browser</DemoBadge>}>
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={!loaded}>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Accent colour</p>
          <p className="mb-3 text-[13px] text-muted">Highlights the spoken caption word.</p>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_COLORS.map((c) => {
              const selected = !HEX_COLOR.test(custom) && accent === c.value;
              return (
                <button key={c.key} type="button" onClick={() => { setAccent(c.value); setCustom(""); }} aria-pressed={selected} title={c.label} className={cn("focus-ring grid size-9 place-items-center rounded-full border-2 transition-[border-color,transform] duration-150 hover:-translate-y-px", selected ? "border-ink" : "border-transparent")}>
                  <span className="size-6 rounded-full border border-border" style={{ backgroundColor: c.value }} aria-hidden />
                  <span className="sr-only">{c.label}</span>
                </button>
              );
            })}
            <Input id="customAccent" value={custom} onChange={(e) => setCustom(e.target.value.trim())} placeholder="#1F3A5F" maxLength={7} className="h-9 w-28 text-[13px]" aria-label="Custom accent colour (hex)" />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="captionStyle" label="Captions" hint={CAPTION_STYLE_META[captionStyle].blurb}>
            <select id="captionStyle" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value as CaptionStyle)} className={cn(controlClass, controlStateClass(false), "h-11")}>
              {CAPTION_STYLES.map((k) => (
                <option key={k} value={k}>{CAPTION_STYLE_META[k].label}</option>
              ))}
            </select>
          </Field>
          <Field id="font" label="Font" hint={FONT_META[font].blurb}>
            <select id="font" value={font} onChange={(e) => setFont(e.target.value as FontKey)} className={cn(controlClass, controlStateClass(false), "h-11")}>
              {FONT_KEYS.map((k) => (
                <option key={k} value={k}>{FONT_META[k].label}</option>
              ))}
            </select>
          </Field>
        </div>
        {msg && (
          <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{msg.text}</p>
        )}
        <Button type="submit" variant="primary" disabled={busy || !loaded}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save defaults
        </Button>
      </form>
    </SectionCard>
  );
}
