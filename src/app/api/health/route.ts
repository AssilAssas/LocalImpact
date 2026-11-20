import { NextResponse } from "next/server";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { prisma } = getAppDeps();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "unreachable" },
      { status: 503 }
    );
  }
}
