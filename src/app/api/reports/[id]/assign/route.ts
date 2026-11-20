import { NextResponse } from "next/server";
import { assignReportUseCase } from "@/application/use-cases/reports";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { verifySameOriginRequest } from "@/infrastructure/auth/session";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origine de requête non autorisée." },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;
    const actor = await getCurrentSessionUser();
    const body = await request.json();
    const { reports, users } = getAppDeps();
    const report = await assignReportUseCase(
      { reports, users },
      actor,
      id,
      body
    );
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}
