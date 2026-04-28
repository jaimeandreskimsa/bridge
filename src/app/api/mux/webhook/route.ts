import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("mux-signature") ?? "";

  try {
    mux.webhooks.verifySignature(body, { "mux-signature": signature }, process.env.MUX_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Signature inválida" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.type === "video.asset.ready") {
    const assetId = event.data.id as string;
    const playbackIds = event.data.playback_ids as { id: string; policy: string }[];
    const playbackId = playbackIds?.[0]?.id;
    const duration = event.data.duration as number | undefined;

    if (playbackId) {
      await db.lesson.updateMany({
        where: { muxAssetId: assetId },
        data: {
          muxPlaybackId: playbackId,
          duration: duration ? Math.round(duration) : undefined,
        },
      });
    }
  }

  if (event.type === "video.asset.errored") {
    const assetId = event.data.id as string;
    await db.lesson.updateMany({
      where: { muxAssetId: assetId },
      data: { muxPlaybackId: null },
    });
  }

  return NextResponse.json({ received: true });
}
