import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Dev-only scratch space for uploaded and processed product photos. Cleared by the OS. */
const DIR = path.join(os.tmpdir(), "reelay-dev-product-clip");

export type Variant = "original" | "crop" | "expand";

export async function saveImage(id: string, variant: Variant, data: Buffer) {
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${id}-${variant}`), data);
}

export async function loadImage(id: string, variant: Variant): Promise<Buffer | null> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  try {
    return await readFile(path.join(DIR, `${id}-${variant}`));
  } catch {
    return null;
  }
}
