import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { createShareLink, listShareLinks, MAX_SHARE_DAYS } from "@/lib/shareLinks";
import { absoluteUrl } from "@/lib/site";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const { id } = await ctx.params;
    return Response.json({ links: await listShareLinks(await requireScope(), id) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({ expiresInDays: z.number().int().min(1).max(MAX_SHARE_DAYS).optional(), allowDownload: z.boolean().optional(), language: z.string().max(40).optional() });

/** Makes a viewing link; the URL is returned once (the token is only stored as a hash). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const { id } = await ctx.params;
    const parsed = Body.safeParse((await readJson(request)) ?? {});
    if (!parsed.success) return Response.json({ error: `Expiry is 1 to ${MAX_SHARE_DAYS} days.` }, { status: 400 });
    const link = await createShareLink(await requireScope(), id, parsed.data);
    return Response.json({ ...link, url: absoluteUrl(`/share/${link.token}`) }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
