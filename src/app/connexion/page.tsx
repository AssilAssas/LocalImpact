import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentSessionUser().catch(() => null);
  const { next } = await searchParams;
  const safeRedirect =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (user) {
    redirect(safeRedirect);
  }

  return (
    <section className="py-6">
      <AuthForm mode="login" redirectTo={safeRedirect} />
    </section>
  );
}
