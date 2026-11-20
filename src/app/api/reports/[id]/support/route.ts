import { NextResponse } from "next/server";
import { supportReportUseCase } from "@/application/use-cases/reports";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { verifySameOriginRequest } from "@/infrastructure/auth/session";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export async function POST(
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
    const { reports } = getAppDeps();
    const result = await supportReportUseCase({ reports }, actor, id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
