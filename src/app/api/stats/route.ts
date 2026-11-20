import { NextResponse } from "next/server";
import { getDashboardStatsUseCase } from "@/application/use-cases/reports";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { reports } = getAppDeps();
    const stats = await getDashboardStatsUseCase({ reports });
    return NextResponse.json({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}
