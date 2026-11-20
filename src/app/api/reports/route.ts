import { NextResponse } from "next/server";
import {
  createReportUseCase,
  listReportsUseCase,
} from "@/application/use-cases/reports";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { verifySameOriginRequest } from "@/infrastructure/auth/session";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = {
      search: url.searchParams.get("search") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      location: url.searchParams.get("location") ?? undefined,
      assignedToId: url.searchParams.get("assignedToId") ?? undefined,
    };

    const viewer = await getCurrentSessionUser().catch(() => null);
    const { reports } = getAppDeps();
    const items = await listReportsUseCase({ reports }, filters, viewer);
    return NextResponse.json({ reports: items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origine de requête non autorisée." },
      { status: 403 }
    );
  }

  try {
    const actor = await getCurrentSessionUser();
    const contentType = request.headers.get("content-type") ?? "";
    const { reports, storage } = getAppDeps();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawInput = {
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        location: formData.get("location"),
      };

      const photoEntry = formData.get("photo");
      let photo: { buffer: Buffer; mimeType: string; size: number } | null =
        null;

      if (photoEntry instanceof File && photoEntry.size > 0) {
        const arrayBuffer = await photoEntry.arrayBuffer();
        photo = {
          buffer: Buffer.from(arrayBuffer),
          mimeType: photoEntry.type,
          size: photoEntry.size,
        };
      }

      const created = await createReportUseCase(
        { reports, storage },
        actor,
        rawInput,
        photo
      );
      return NextResponse.json({ report: created }, { status: 201 });
    }

    const body = await request.json();
    const created = await createReportUseCase(
      { reports, storage },
      actor,
      body,
      null
    );
    return NextResponse.json({ report: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
