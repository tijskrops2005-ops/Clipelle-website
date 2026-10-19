import {
  analyzeProductPhoto,
  cropToNineSixteen,
  planNineSixteen,
  toPreviewDataUrl,
} from "@/lib/services/productClip";
import { devOnly, errorResponse } from "../../_guard";
import { saveImage } from "../_store";

/** Free: analyse the photo, plan the 9:16 framing and render the crop preview. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return Response.json({ error: "Upload an image file." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return Response.json({ error: "Image is larger than 15 MB." }, { status: 400 });
    }
    const original = Buffer.from(await file.arrayBuffer());
    const analysis = await analyzeProductPhoto(original);
    const plan = planNineSixteen(analysis);
    const cropped = await cropToNineSixteen(original, plan.crop);

    const imageId = crypto.randomUUID();
    await saveImage(imageId, "original", original);
    await saveImage(imageId, "crop", cropped);

    return Response.json({
      imageId,
      analysis,
      plan,
      previews: {
        original: await toPreviewDataUrl(original, 640),
        crop: await toPreviewDataUrl(cropped, 480),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
