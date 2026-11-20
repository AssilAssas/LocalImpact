import { NextResponse } from "next/server";
import { getReportDetailUseCase } from "@/application/use-cases/reports";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const viewer = await getCurrentSessionUser().catch(() => null);
    const { reports } = getAppDeps();
    const report = await getReportDetailUseCase({ reports }, id, viewer);
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}
