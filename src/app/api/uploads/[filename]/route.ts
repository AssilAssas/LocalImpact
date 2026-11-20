import { NextResponse } from "next/server";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const { storage } = getAppDeps();
  const file = await storage.readImage(filename);

  if (!file) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
