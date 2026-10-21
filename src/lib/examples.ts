import { existsSync } from "node:fs";
import path from "node:path";
import { examples, type Example } from "@/content/examples";

/**
 * Resolves the example videos to URLs (server components only: it looks at the file system).
 * Order: NEXT_PUBLIC_EXAMPLES_BASE_URL when set → the public "examples" bucket of our own storage
 * (derived from NEXT_PUBLIC_SUPABASE_URL) → public/examples/ on disk (ignored by git) → nothing,
 * which the gallery shows as "Sample coming soon".
 */
export type ResolvedExample = Example & { src: string; posterSrc?: string };

export const EXAMPLES_BUCKET = "examples";

function remoteBase(): string | null {
  const explicit = process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  return supabase ? `${supabase}/storage/v1/object/public/${EXAMPLES_BUCKET}` : null;
}

function resolveFile(file: string): string | null {
  const base = remoteBase();
  if (base) return `${base}/${encodeURIComponent(file)}`;
  return existsSync(path.join(process.cwd(), "public", "examples", file)) ? `/examples/${file}` : null;
}

/** Every example that has a reachable file, in the order of the content list. */
export function resolvedExamples(kind?: Example["kind"]): ResolvedExample[] {
  const list = kind ? examples.filter((e) => e.kind === kind) : examples;
  return list.flatMap((e) => {
    const src = resolveFile(e.file);
    if (!src) return [];
    const posterSrc = e.poster ? resolveFile(e.poster) ?? undefined : undefined;
    return [{ ...e, src, posterSrc }];
  });
}

export function firstExample(kind: Example["kind"]): ResolvedExample | undefined {
  return resolvedExamples(kind)[0];
}
