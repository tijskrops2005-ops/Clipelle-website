import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getBrandDefaults, getOrCreateProfile, saveBrandDefaults } from "@/lib/data/profile";
import { deleteObject, downloadObject, putObject } from "@/lib/storage";
import { detectLogoKind, logoProblem, MAX_LOGO_BYTES } from "@/lib/brandLogo";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Where a user's logo lives: under the user, never under a project. */
function logoPathFor(userId: string, ext: string) {
  return `users/${userId}/brand/logo-${Date.now().toString(36)}.${ext}`;
}

function ownsPath(userId: string, path: string | undefined): path is string {
  return typeof path === "string" && path.startsWith(`users/${userId}/brand/`);
}

/** The signed-in user's logo bytes (our own route, so the browser can also read it back as a File). */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const brand = await getBrandDefaults(user.id);
    if (!ownsPath(user.id, brand.logoPath)) return new Response(null, { status: 404 });
    const blob = await downloadObject(brand.logoPath);
    if (!blob) return new Response(null, { status: 404 });
    const mime = brand.logoPath.endsWith(".svg") ? "image/svg+xml" : brand.logoPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(blob, { headers: { "Content-Type": mime, "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="logo.${brand.logoPath.split(".").pop()}"`, "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Uploads a new logo (multipart field "file"): PNG, JPG or plain SVG, 2 MB; replaces and deletes the old one. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_LOGO_BYTES + 4096) return Response.json({ error: `The logo is larger than ${MAX_LOGO_BYTES / (1024 * 1024)} MB.` }, { status: 413 });
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a PNG, JPG or SVG file." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectLogoKind(bytes);
    const problem = logoProblem(bytes.byteLength, kind);
    if (problem || !kind) return Response.json({ error: problem ?? "Use a PNG, JPG or plain SVG file." }, { status: 400 });

    const before = await getBrandDefaults(user.id);
    const path = logoPathFor(user.id, kind.ext);
    await putObject(path, bytes, kind.mime);
    await saveBrandDefaults(user.id, { ...before, logoPath: path });
    if (ownsPath(user.id, before.logoPath) && before.logoPath !== path) await deleteObject(before.logoPath).catch(() => {});
    return Response.json({ ok: true, logoPath: path, logoUrl: `/api/settings/brand/logo?v=${path.split("/").pop()}` });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Removes the logo from storage and from the brand defaults. */
export async function DELETE() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const before = await getBrandDefaults(user.id);
    if (ownsPath(user.id, before.logoPath)) await deleteObject(before.logoPath).catch(() => {});
    const { logoPath: _dropped, ...rest } = before;
    void _dropped;
    await saveBrandDefaults(user.id, rest);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
