import { balanceOf, getAccount, getVideo } from "@/lib/services/heygen";
import { devOnly, errorResponse } from "../../_guard";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const { id } = await context.params;
  try {
    const [video, account] = await Promise.all([getVideo(id), getAccount()]);
    return Response.json({
      status: video.status,
      videoUrl: video.video_url ?? null,
      thumbnailUrl: video.thumbnail_url ?? null,
      duration: video.duration ?? null,
      failureCode: video.failure_code ?? null,
      failureMessage: video.failure_message ?? null,
      balance: balanceOf(account),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
