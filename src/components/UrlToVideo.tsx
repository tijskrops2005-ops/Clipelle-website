"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Link2, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductPageData } from "@/lib/productPage";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import type { UploadedImage } from "@/components/ui/UploadDropzone";
import { ProjectForm, type ProjectFormInitial } from "@/components/ProjectForm";

type Fetched = ProductPageData & { pageUrl: string };

async function api<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status}).`);
  return data as T;
}

/**
 * URL to video: paste a product link → the server reads the page (no AI) → you check the facts and
 * tick the photos you own → the normal ad form opens, prefilled. From there everything is the same
 * flow and the same draft as "Image to video".
 */
export function UrlToVideo() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "fetching" | "preview" | "downloading" | "form">("idle");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Fetched | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initial, setInitial] = useState<ProjectFormInitial | null>(null);

  async function onFetch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("fetching");
    try {
      const data = await api<Fetched>("/api/product-page", { url });
      setPage(data);
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setPicked(new Set(data.images.slice(0, 3)));
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that page.");
      setPhase("idle");
    }
  }

  async function onConfirm() {
    if (!page) return;
    setError(null);
    setPhase("downloading");
    const images: UploadedImage[] = [];
    const failed: string[] = [];
    for (const src of page.images.filter((i) => picked.has(i))) {
      try {
        const r = await fetch("/api/product-page/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: src }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "download failed");
        const blob = await r.blob();
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const file = new File([blob], `product-${images.length + 1}.${ext}`, { type: blob.type });
        images.push({ id: `url-${images.length}`, file, previewUrl: URL.createObjectURL(file) });
      } catch {
        failed.push(src);
      }
    }
    if (failed.length) setError(`${failed.length} photo${failed.length === 1 ? "" : "s"} could not be downloaded. You can add photos on the form.`);
    setInitial({ values: { productName: name.trim(), description: description.trim(), productUrl: page.canonicalUrl ?? page.pageUrl, projectName: name.trim().slice(0, 60) }, images });
    setPhase("form");
  }

  if (phase === "form" && initial) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-5 py-4 shadow-card">
          <p className="text-[15px] text-ink"><Check className="mr-1.5 inline size-4 text-success" aria-hidden />Filled in from the product page. Check everything below; the video is made from what you leave here.</p>
          <Button type="button" variant="link" onClick={() => { setInitial(null); setPhase("preview"); }}><RotateCcw className="size-4" aria-hidden /> Back to the page details</Button>
        </div>
        {error && <p role="status" className="text-[13px] text-warning">{error}</p>}
        <ProjectForm initial={initial} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard number={1} title="Paste a product link" description="We read the page's product data: name, description, photos and price. Nothing is sent to an AI and nothing is used before you confirm it.">
        <form onSubmit={onFetch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field id="productLink" label="Product page" className="flex-1">
            <Input id="productLink" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourshop.com/products/…" required disabled={phase === "fetching"} />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={phase === "fetching" || !url.trim()}>
            {phase === "fetching" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            {phase === "fetching" ? "Reading the page…" : "Read the page"}
          </Button>
        </form>
        {error && phase !== "preview" && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
        <p className="mt-3 text-[13px] text-muted">Public product pages only. Pages behind a login, private addresses and files larger than 2 MB are refused.</p>
      </SectionCard>

      {page && (phase === "preview" || phase === "downloading") && (
        <SectionCard number={2} title="Check what we found" description={page.source === "none" ? "This page has no product data we could read. Fill in the fields yourself." : `Read from the page's ${page.source === "json-ld" ? "product data" : page.source === "open-graph" ? "sharing tags" : "title and headings"}. Edit anything that is wrong.`}>
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="urlName" label="Product name">
              <Input id="urlName" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="text-[13px] text-muted md:pt-7">
              {page.brand && <p>Brand on the page: <span className="text-ink">{page.brand}</span></p>}
              {page.price && <p>Price on the page: <span className="text-ink">{page.price}</span> (for your information; put an offer in the form if you want it mentioned)</p>}
              <p className="truncate">Link: <span className="text-ink">{page.canonicalUrl ?? page.pageUrl}</span></p>
            </div>
          </div>
          <Field id="urlDescription" label="Product description" hint="The script is written from this. Facts beat marketing words." className="mt-5">
            <textarea id="urlDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="focus-ring w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink" />
          </Field>
          <div className="mt-6">
            <p className="text-sm font-medium text-ink">Photos on the page</p>
            <p className="mb-3 text-[13px] text-muted">Tick the ones to use (up to 5). They are copied only after you confirm.</p>
            {page.images.length === 0 ? (
              <p className="text-[13px] text-muted">No photos found. You can upload your own on the next step.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {page.images.map((src) => {
                  const on = picked.has(src);
                  return (
                    <li key={src}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPicked((s) => { const n = new Set(s); if (n.has(src)) n.delete(src); else if (n.size < 5) n.add(src); return n; })}
                        className={cn("focus-ring relative block aspect-square w-full overflow-hidden rounded-tile bg-surface-muted", on ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- the shop's own photo, shown for the customer to pick */}
                        <img src={src} alt="" className="size-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                        {on && <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-divider pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted">Only use products and photos you own or have the rights to use.</p>
            <Button type="button" variant="accent" size="lg" onClick={onConfirm} disabled={phase === "downloading" || !name.trim()}>
              {phase === "downloading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {phase === "downloading" ? "Copying photos…" : "Use these details"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
          {error && phase === "preview" && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
        </SectionCard>
      )}
    </div>
  );
}
