/**
 * Tiny helpers for the go-live scripts: read an env file into an object and set one variable in
 * it, without ever printing a value. Used by heygen-webhook.mjs and vercel-env.mjs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function readEnvFile(path) {
  if (!existsSync(path)) throw new Error(`${path} does not exist. Copy .env.example to ${path} and fill it in first.`);
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** Sets NAME=value in the file: replaces an existing line or appends one. */
export function setEnvVar(path, name, value) {
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const i = lines.findIndex((l) => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(l));
  if (i >= 0) lines[i] = `${name}=${value}`;
  else lines.splice(lines.length && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length, 0, `${name}=${value}`);
  writeFileSync(path, lines.join("\n").replace(/\n?$/, "\n"));
}
