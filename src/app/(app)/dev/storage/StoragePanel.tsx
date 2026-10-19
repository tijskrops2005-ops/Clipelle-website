"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Loader2, Upload } from "lucide-react";
import { uploadToSignedUrl } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StorageMeter, type Usage } from "@/components/dev/StorageMeter";

export function StoragePanel() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ path: string; bytes: number; mime: string; ms: number; downloadUrl: string } | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const loadUsage = useCallback(() => {
    return fetch("/api/dev/storage")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        return b as Usage;
      })
      .then((u) => {
        setUsage(u);
        setUsageError(null);
      })
      .catch((e: Error) => setUsageError(e.message));
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const r = await fetch("/api/dev/storage/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, bytes: file.size }) });
      const signed = await r.json();
      if (!r.ok) throw new Error(signed.error ?? `HTTP ${r.status}`);
      const started = Date.now();
      await uploadToSignedUrl(signed.path, signed.token, file);
      setUploadResult(`${signed.path} · ${(file.size / 1e6).toFixed(2)} MB in ${Date.now() - started} ms, straight from the browser`);
      void loadUsage();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function copy() {
    setCopying(true);
    setCopyError(null);
    setCopyResult(null);
    try {
      const r = await fetch("/api/dev/storage/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
      setCopyResult(b);
      void loadUsage();
    } catch (e) {
      setCopyError((e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {usageError ? <p role="alert" className="text-sm text-danger">{usageError}</p> : usage ? <StorageMeter usage={usage} detailed /> : <Skeleton className="h-20" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct upload test</CardTitle>
          <p className="mt-1 text-[15px] text-muted">Browser → signed URL → our bucket. Our server only signs.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="file" label="File (any type, up to 50 MB)">
            <input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-ink file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:text-surface" />
          </Field>
          <Button onClick={upload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            Upload
          </Button>
          {uploadResult && <p className="break-all text-[13px] text-success">{uploadResult}</p>}
          {uploadError && <p role="alert" className="text-sm text-danger">{uploadError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Copy from a provider URL</CardTitle>
          <p className="mt-1 text-[15px] text-muted">Paste a result URL from HeyGen, fal.ai or Shotstack. It lands in our bucket and gets a signed download link.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="url" label="Public https URL">
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/render.mp4" />
          </Field>
          <Button onClick={copy} disabled={!/^https:\/\//.test(url) || copying}>
            {copying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            Copy into storage
          </Button>
          {copyResult && (
            <div className="space-y-2 text-[13px]">
              <p className="break-all text-success">
                {copyResult.path} · {(copyResult.bytes / 1e6).toFixed(2)} MB · {copyResult.mime} · {copyResult.ms} ms
              </p>
              <Button href={copyResult.downloadUrl} variant="secondary" size="sm" target="_blank" rel="noreferrer">
                <Download className="size-4" aria-hidden />
                Open signed download (1 h)
              </Button>
            </div>
          )}
          {copyError && <p role="alert" className="text-sm text-danger">{copyError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
