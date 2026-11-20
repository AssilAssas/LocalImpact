import { NextResponse } from "next/server";
import { getServerSession } from "@/infrastructure/auth/session";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const { users } = getAppDeps();
    const freshUser = await users.findById(session.userId);
    if (!freshUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: freshUser }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
