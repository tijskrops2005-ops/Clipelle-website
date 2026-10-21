import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getBrandDefaults, getOrCreateProfile, saveBrandDefaults } from "@/lib/data/profile";
import { CAPTION_STYLES, FONT_KEYS, HEX_COLOR } from "@/lib/adOptions";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    const brand = await getBrandDefaults(user.id);
    return Response.json({ ...brand, logoUrl: brand.logoPath ? `/api/settings/brand/logo?v=${brand.logoPath.split("/").pop()}` : undefined });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({
  accent: z.string().regex(HEX_COLOR).optional().or(z.literal("")),
  captionStyle: z.enum(CAPTION_STYLES).optional().or(z.literal("")),
  font: z.enum(FONT_KEYS).optional().or(z.literal("")),
});

/** Saves the brand defaults; empty values clear a field. The logo is managed by ./logo and kept here. The ad form reads them as initial values only. */
export async function PUT(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Check the colour (#RRGGBB), caption style and font." }, { status: 400 });
    await getOrCreateProfile(user);
    const b = parsed.data;
    const { logoPath } = await getBrandDefaults(user.id);
    await saveBrandDefaults(user.id, { accent: b.accent || undefined, captionStyle: b.captionStyle || undefined, font: b.font || undefined, logoPath });
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
