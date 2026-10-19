import { connection } from "next/server";
import { listVoiceOptions } from "@/lib/voices";
import { isAdLanguage } from "@/lib/voiceOptions";
import { dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly } from "../projects/_guard";


/** Voices for the picker on /new/ad: language + accent + gender filter (free listing calls, cached). */
export async function GET(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const q = new URL(request.url).searchParams;
  const languageRaw = q.get("language") ?? "en";
  const language = isAdLanguage(languageRaw) ? languageRaw : "en";
  const genderRaw = q.get("gender");
  const gender = genderRaw === "female" || genderRaw === "male" ? genderRaw : undefined;
  const accent = q.get("accent") || undefined;
  const lookVoiceId = q.get("lookVoiceId") || undefined;
  try {
    return Response.json(await listVoiceOptions({ language, accent, gender, lookVoiceId }));
  } catch (error) {
    return dataErrorResponse(error);
  }
}
