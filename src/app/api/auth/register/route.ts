import { NextResponse } from "next/server";
import { registerUserUseCase } from "@/application/use-cases/auth";
import {
  buildSessionCookieHeader,
  verifySameOriginRequest,
} from "@/infrastructure/auth/session";
import { getAppDeps } from "@/infrastructure/container";
import { handleApiError } from "@/infrastructure/http/api-response";

export async function POST(request: Request) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origine de requête non autorisée." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { users, hasher } = getAppDeps();
    const user = await registerUserUseCase({ users, hasher }, body);

    const cookie = await buildSessionCookieHeader({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
