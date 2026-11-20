import { NextResponse } from "next/server";
import { findSimilarReportsUseCase } from "@/application/use-cases/reports";
import { CATEGORIES, type Category } from "@/domain/types";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const title = url.searchParams.get("title") ?? "";
    const rawCategory = url.searchParams.get("category") ?? "";
    const location = url.searchParams.get("location") ?? "";

    const category = CATEGORIES.includes(rawCategory as Category)
      ? (rawCategory as Category)
      : undefined;

    const { reports } = getAppDeps();
    const similar = await findSimilarReportsUseCase(
      { reports },
      { title, category, location }
    );

    return NextResponse.json({ similar });
  } catch (error) {
    return handleApiError(error);
  }
}
