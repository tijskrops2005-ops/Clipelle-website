import { connection } from "next/server";
import { balanceOf, getAccount, listAllLooks, listVoices, type AvatarLook } from "@/lib/services/heygen";
import { lookOrientation } from "@/lib/lookOrientation";
import { devOnly, errorResponse } from "../_guard";

const supportsBoth = (l: AvatarLook) => !!l.supported_api_engines?.includes("avatar_iv") && !!l.supported_api_engines?.includes("avatar_iii");

/** Free: every public look with its orientation, an inventory, candidates for the ad default, voices and the balance. */
export async function GET() {
  await connection(); // never prerender or cache: live data from HeyGen
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    // Studio avatars and digital twins (≈42 free calls). Photo avatars (4,000+, mostly landscape) are left out of the picker.
    const [studio, twins, voices, account] = await Promise.all([listAllLooks("studio_avatar"), listAllLooks("digital_twin"), listVoices({ language: "English", limit: 100 }), getAccount()]);
    const allLooks = [...studio, ...twins];
    const looks = allLooks.map((l) => ({ ...l, orientation: lookOrientation(l), bothEngines: supportsBoth(l) }));
    const portrait = looks.filter((l) => l.orientation === "portrait");
    const count = (list: typeof looks, gender: string) => list.filter((l) => (l.gender ?? "").toLowerCase() === gender).length;
    const inventory = {
      total: looks.length,
      portrait: portrait.length,
      landscape: looks.filter((l) => l.orientation === "landscape").length,
      square: looks.filter((l) => l.orientation === "square").length,
      unknown: looks.filter((l) => l.orientation === "unknown").length,
      portraitBothEngines: portrait.filter((l) => l.bothEngines).length,
      portraitByGender: { female: count(portrait, "female"), male: count(portrait, "male"), other: portrait.length - count(portrait, "female") - count(portrait, "male") },
      portraitBothEnginesByGender: { female: count(portrait.filter((l) => l.bothEngines), "female"), male: count(portrait.filter((l) => l.bothEngines), "male") },
    };
    // Candidates for the ad default: portrait, both engines, female (target audience women 25–40).
    const candidates = portrait
      .filter((l) => l.bothEngines && (l.gender ?? "").toLowerCase() === "female")
      .map((l) => ({ id: l.id, name: l.name, groupId: l.group_id ?? null, avatarType: l.avatar_type ?? null, tags: l.tags ?? [], defaultVoiceId: l.default_voice_id ?? null, preview: l.preview_image_url ?? null, size: `${l.image_width ?? "?"}×${l.image_height ?? "?"}` }));
    return Response.json({
      looks,
      inventory,
      candidates,
      voices,
      account: { billingType: account.billing_type ?? null, balance: balanceOf(account) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
