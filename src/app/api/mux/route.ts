import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST() {
  const session = await auth();
  if (!session?.user || !["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
    new_asset_settings: {
      playback_policy: ["signed"],
      mp4_support: "standard",
    },
  });

  return NextResponse.json({ uploadId: upload.id, url: upload.url });
}
