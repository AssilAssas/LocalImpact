import { NextResponse } from "next/server";
import { listUsersUseCase } from "@/application/use-cases/auth";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getCurrentSessionUser();
    const { users } = getAppDeps();
    const items = await listUsersUseCase({ users }, actor);
    return NextResponse.json({ users: items });
  } catch (error) {
    return handleApiError(error);
  }
}
