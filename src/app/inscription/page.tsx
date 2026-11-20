import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentSessionUser().catch(() => null);
  if (user) {
    redirect("/");
  }

  return (
    <section className="py-6">
      <AuthForm mode="register" />
    </section>
  );
}
