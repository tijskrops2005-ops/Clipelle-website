import { connection } from "next/server";
import { isPresenterEngine, DEFAULT_PRESENTER_ENGINE } from "@/lib/pricing";
import { listPresenters } from "@/lib/presenters";
import { dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly } from "../projects/_guard";

/** Presenter looks for the picker on /new/ad (free listing calls, cached server-side). */
export async function GET(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const q = new URL(request.url).searchParams;
  const engineRaw = q.get("engine") ?? DEFAULT_PRESENTER_ENGINE;
  const engine = isPresenterEngine(engineRaw) ? engineRaw : DEFAULT_PRESENTER_ENGINE;
  const genderRaw = q.get("gender");
  const gender = genderRaw === "female" || genderRaw === "male" ? genderRaw : undefined;
  const page = Math.max(0, Number(q.get("page")) || 0);
  try {
    return Response.json(await listPresenters({ engine, gender, page }));
  } catch (error) {
    return dataErrorResponse(error);
  }
}
