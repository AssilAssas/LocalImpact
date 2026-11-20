import type { SessionUser } from "@/domain/types";
import { getAppDeps } from "../container";
import { getServerSession } from "./session";

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const tokenUser = await getServerSession();
  if (!tokenUser) return null;

  const { users } = getAppDeps();
  const dbUser = await users.findById(tokenUser.userId);
  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
  };
}
