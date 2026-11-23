"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { CAPTION_STYLES, CAPTION_STYLE_META, DEFAULT_ACCENT, DEFAULT_CAPTION_STYLE, DEFAULT_FONT, FONT_KEYS, FONT_META, HEX_COLOR, type CaptionStyle, type FontKey } from "@/lib/adOptions";
import { barFromHex, barMeta, contrastRatio, DEFAULT_CAPTION_STYLE as DEFAULT_CAPTION_LOOK, isBarOn } from "@/lib/captionOptions";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { LOW_CONTRAST } from "@/components/translate/CaptionStylePicker";
import { getBrandDefaults, removeBrandLogo, saveBrandDefaults, uploadBrandLogo } from "@/lib/data/settingsClient";
import { detectLogoKind, LOGO_ACCEPT, logoProblem, MAX_LOGO_BYTES } from "@/lib/brandLogo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SectionCard } from "@/components/ui/SectionCard";
import { DemoBadge } from "@/components/DemoModeBadge";
import { Select } from "@/components/ui/Select";
import { config } from "@/lib/config";

/**
 * Brand defaults: the caption colours new translations start with and the logo for the edit screen;
 * with ads on also the accent, caption look and font the ad form starts with (23 Nov 2026: the
 * ad-only fields follow `config.features.ads`). A form still sends exactly what is picked there.
 */
export function BrandSettings() {
  const ads = config.features.ads;
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  // Caption colours for new translations (2 Nov 2026): the spoken word, the words, the background (null = none).
  const [capColor, setCapColor] = useState<string>(DEFAULT_CAPTION_LOOK.color);
  const [capText, setCapText] = useState<string>(DEFAULT_CAPTION_LOOK.textColor ?? "#FFFFFF");
  const [capBar, setCapBar] = useState<string | null>(null);
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
      setLogoMsg({ tone: "ok", text: ads ? "Logo saved. New ads start with it, and you can add it to any video on the edit screen." : "Logo saved. Add it to a finished video on the edit screen." });
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
      setLogoMsg({ tone: "ok", text: "Logo removed." });
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
        if (b.accent && HEX_COLOR.test(b.accent)) setAccent(b.accent.toUpperCase());
        if (b.captionColors) {
          if (b.captionColors.color) setCapColor(b.captionColors.color);
          if (b.captionColors.textColor) setCapText(b.captionColors.textColor);
          setCapBar(isBarOn(b.captionColors.bar) ? barMeta(b.captionColors.bar).color : null);
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
    const effective = accent;
    const bar = barFromHex(capBar);
    const captionColors = {
      ...(capColor.toUpperCase() !== DEFAULT_CAPTION_LOOK.color ? { color: capColor } : {}),
      ...(capText.toUpperCase() !== (DEFAULT_CAPTION_LOOK.textColor ?? "#FFFFFF") ? { textColor: capText } : {}),
      ...(bar !== "none" ? { bar } : {}),
    };
    try {
      await saveBrandDefaults({ accent: effective !== DEFAULT_ACCENT ? effective : undefined, captionStyle: captionStyle !== DEFAULT_CAPTION_STYLE ? captionStyle : undefined, font: font !== DEFAULT_FONT ? font : undefined, captionColors: Object.keys(captionColors).length ? captionColors : undefined });
      setMsg({ tone: "ok", text: ads ? "Saved. New videos start with these values." : "Saved. New translations start with these colours." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Logo" description="Shown small, top right, for the whole video. PNG with a transparent background works best; JPG and plain SVG also work." aside={<DemoBadge>Stored in this browser</DemoBadge>}>
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
            <p className="text-[13px] text-muted">{ads ? "New ads start with this logo; on the edit screen you add it to any finished video." : "On the edit screen you add it to a finished video."} Up to {MAX_LOGO_BYTES / (1024 * 1024)} MB.</p>
            {logoMsg && (
              <p role={logoMsg.tone === "error" ? "alert" : "status"} className={logoMsg.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{logoMsg.text}</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={ads ? "Brand defaults" : "Caption colours"} description={ads ? "What a new video starts with. You can still change it per video." : "What a new translation starts with. You can still change them per video."} aside={<DemoBadge>Stored in this browser</DemoBadge>}>
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={!loaded}>
        <div className="space-y-3">
          {ads && (
            <div>
              <p className="text-sm font-medium text-ink">Caption colours for translations</p>
              <p className="text-[13px] text-muted">New translations start with these; you can still change them per video.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <ColorPicker id="brandCaptionHighlight" label="Highlight colour" value={capColor} onChange={(hex) => hex && setCapColor(hex)} />
            <ColorPicker id="brandCaptionText" label="Text colour" value={capText} onChange={(hex) => hex && setCapText(hex)} note={capBar && contrastRatio(capText, capBar) < LOW_CONTRAST ? "Low contrast" : undefined} />
            <ColorPicker id="brandCaptionBackground" label="Background" value={capBar} onChange={setCapBar} allowNone />
          </div>
        </div>
        {/* Ad-only: the accent, caption look and font of the ad form (hidden while ads are "coming soon"). */}
        {ads && (
          <>
            <ColorPicker id="brandAccent" label="Accent colour for ads" value={accent} onChange={(hex) => hex && setAccent(hex)} note={contrastRatio(accent, "#FFFFFF") < 3 ? "Low contrast" : undefined} />
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="captionStyle" label="Captions" hint={CAPTION_STYLE_META[captionStyle].blurb}>
                <Select id="captionStyle" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value as CaptionStyle)}>
                  {CAPTION_STYLES.map((k) => (
                    <option key={k} value={k}>{CAPTION_STYLE_META[k].label}</option>
                  ))}
                </Select>
              </Field>
              <Field id="font" label="Font" hint={FONT_META[font].blurb}>
                <Select id="font" value={font} onChange={(e) => setFont(e.target.value as FontKey)}>
                  {FONT_KEYS.map((k) => (
                    <option key={k} value={k}>{FONT_META[k].label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}
        {msg && (
          <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{msg.text}</p>
        )}
        <Button type="submit" variant="primary" disabled={busy || !loaded}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {ads ? "Save defaults" : "Save colours"}
        </Button>
      </form>
      </SectionCard>
    </div>
  );
}
