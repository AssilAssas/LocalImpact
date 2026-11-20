import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { SessionPort } from "@/application/ports";
import type { Role, SessionUser } from "@/domain/types";

export const SESSION_COOKIE_NAME = "localimpact_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 jours

const globalForSecret = globalThis as unknown as {
  ephemeralSessionSecret: Uint8Array | undefined;
};

function getSecretKey(): Uint8Array {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return new TextEncoder().encode(configured);
  }
  if (!globalForSecret.ephemeralSessionSecret) {
    globalForSecret.ephemeralSessionSecret = crypto.randomBytes(32);
  }
  return globalForSecret.ephemeralSessionSecret;
}

export class JoseSessionAdapter implements SessionPort {
  async sign(user: SessionUser): Promise<string> {
    return new SignJWT({
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.userId)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
      .sign(getSecretKey());
  }

  async verify(token: string): Promise<SessionUser | null> {
    try {
      const { payload } = await jwtVerify(token, getSecretKey(), {
        algorithms: ["HS256"],
      });
      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.role !== "string"
      ) {
        return null;
      }
      return {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role as Role,
      };
    } catch {
      return null;
    }
  }
}

const sessionAdapter = new JoseSessionAdapter();

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionAdapter.verify(token);
}

export async function buildSessionCookieHeader(
  user: SessionUser
): Promise<{
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    path: string;
    maxAge: number;
    sameSite: "lax" | "none";
    secure: boolean;
  };
}> {
  const token = await sessionAdapter.sign(user);
  const hdrs = await headers();
  const forwardedProto = hdrs.get("x-forwarded-proto");
  const isHttps =
    process.env.COOKIE_SECURE === "true" || forwardedProto === "https";

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
    },
  };
}

export function verifySameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === host;
  } catch {
    return false;
  }
}
