import { adminError, adminOnly } from "@/app/api/admin/_guard";
import { customerLedger, personalWorkspaceOf } from "@/lib/adminCustomers";

/** The customer's credit history, 25 at a time (`?offset=`). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    const { id } = await ctx.params;
    const ws = await personalWorkspaceOf(id);
    if (!ws) return Response.json({ error: "Customer not found." }, { status: 404 });
    const offset = Math.max(0, Number(new URL(request.url).searchParams.get("offset") ?? 0) || 0);
    return Response.json(await customerLedger(ws.id, offset));
  } catch (error) {
    return adminError(error);
  }
}
