import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySameOriginRequest,
} from "@/infrastructure/auth/session";

export async function POST(request: Request) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origine de requête non autorisée." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
