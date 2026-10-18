import {
  balanceOf,
  createAvatarVideo,
  getAccount,
  listLookSelection,
  MAX_TEST_SCRIPT_CHARS,
  type HeygenEngine,
} from "@/lib/services/heygen";
import { devOnly, errorResponse } from "../_guard";

const ENGINES: HeygenEngine[] = ["avatar_iii", "avatar_iv"];

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: {
    lookId?: string;
    voiceId?: string;
    engine?: string;
    script?: string;
    confirmed?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Cost rule: nothing is created without an explicit confirmation from the UI.
  if (body.confirmed !== true) {
    return Response.json({ error: "Confirmation required before creating a paid video." }, { status: 400 });
  }
  const script = (body.script ?? "").trim();
  if (!script || script.length > MAX_TEST_SCRIPT_CHARS) {
    return Response.json(
      { error: `Script must be 1–${MAX_TEST_SCRIPT_CHARS} characters to keep test videos under ~10 seconds.` },
      { status: 400 },
    );
  }
  const engine = body.engine as HeygenEngine;
  if (!ENGINES.includes(engine)) {
    return Response.json({ error: "Engine must be avatar_iii or avatar_iv." }, { status: 400 });
  }
  if (!body.lookId || !body.voiceId) {
    return Response.json({ error: "Choose an avatar and a voice." }, { status: 400 });
  }

  try {
    // Guard: the chosen look must support the engine, otherwise HeyGen rejects it (invalid_parameter).
    const looks = await listLookSelection();
    const look = looks.find((l) => l.id === body.lookId);
    if (look?.supported_api_engines && !look.supported_api_engines.includes(engine)) {
      return Response.json(
        { error: `This avatar does not support ${engine}. Pick another avatar or engine.` },
        { status: 400 },
      );
    }

    const before = balanceOf(await getAccount());
    const created = await createAvatarVideo({
      avatarId: body.lookId,
      voiceId: body.voiceId,
      script,
      engine,
      title: `Reelay test · ${engine} · ${new Date().toISOString()}`,
    });

    return Response.json({
      videoId: created.video_id,
      status: created.status ?? "pending",
      balanceBefore: before,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
