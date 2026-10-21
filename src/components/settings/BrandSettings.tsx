"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { BRAND_COLORS, CAPTION_STYLES, CAPTION_STYLE_META, DEFAULT_ACCENT, DEFAULT_CAPTION_STYLE, DEFAULT_FONT, FONT_KEYS, FONT_META, HEX_COLOR, type CaptionStyle, type FontKey } from "@/lib/adOptions";
import { getBrandDefaults, removeBrandLogo, saveBrandDefaults, uploadBrandLogo } from "@/lib/data/settingsClient";
import { detectLogoKind, LOGO_ACCEPT, logoProblem, MAX_LOGO_BYTES } from "@/lib/brandLogo";
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
  /** Where the saved logo can be shown; undefined = none. The query string changes per upload so the picture refreshes. */
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoBusy, setLogoBusy] = useState<"upload" | "remove" | null>(null);
  const [logoMsg, setLogoMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onPickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoMsg(null);
    // The same rules as the server, checked here first so a wrong file never leaves the browser.
    const sizeProblem = logoProblem(file.size, { ext: "png", mime: "image/png" });
    if (sizeProblem) return setLogoMsg({ tone: "error", text: sizeProblem });
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const kind = detectLogoKind(new Uint8Array(await (isSvg ? file : file.slice(0, 64 * 1024)).arrayBuffer()));
    const typeProblem = logoProblem(file.size, kind);
    if (typeProblem) return setLogoMsg({ tone: "error", text: typeProblem });
    setLogoBusy("upload");
    try {
      const { logoUrl: url } = await uploadBrandLogo(file);
      setLogoUrl(url);
      setLogoMsg({ tone: "ok", text: "Logo saved. New ads start with it, top right; you can still remove it per video." });
    } catch (err) {
      setLogoMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not upload the logo." });
    } finally {
      setLogoBusy(null);
    }
  }

  async function onRemoveLogo() {
    setLogoBusy("remove");
    setLogoMsg(null);
    try {
      await removeBrandLogo();
      setLogoUrl(undefined);
      setLogoMsg({ tone: "ok", text: "Logo removed. New ads start without one." });
    } catch (err) {
      setLogoMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not remove the logo." });
    } finally {
      setLogoBusy(null);
    }
  }

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
        setLogoUrl(b.logoUrl);
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
    <div className="space-y-6">
      <SectionCard title="Logo" description="Shown small, top right, for the whole ad. PNG with a transparent background works best; JPG and plain SVG also work. Up to 2 MB." aside={<DemoBadge>Stored in this browser</DemoBadge>}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-surface-muted" aria-live="polite">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- the customer's own logo, served by our own route
              <img src={logoUrl} alt="Your logo" className="max-h-24 max-w-24 object-contain" />
            ) : (
              <span className="label-mono text-muted">{loaded ? "No logo" : "Loading"}</span>
            )}
          </div>
          <div className="space-y-3">
            <input ref={fileInput} type="file" accept={LOGO_ACCEPT} className="sr-only" onChange={onPickLogo} aria-label="Choose a logo file" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={() => fileInput.current?.click()} disabled={!loaded || logoBusy !== null}>
                {logoBusy === "upload" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="secondary" onClick={onRemoveLogo} disabled={logoBusy !== null}>
                  {logoBusy === "remove" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[13px] text-muted">The ad form starts with this logo in its brand style; what you leave there is what is sent. Limit {MAX_LOGO_BYTES / (1024 * 1024)} MB.</p>
            {logoMsg && (
              <p role={logoMsg.tone === "error" ? "alert" : "status"} className={logoMsg.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{logoMsg.text}</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Brand defaults" description="Starting values for the brand style on the ad form. You can still change them per video." aside={<DemoBadge>Stored in this browser</DemoBadge>}>
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
    </div>
  );
}
