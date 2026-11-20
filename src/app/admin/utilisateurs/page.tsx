import Link from "next/link";
import { redirect } from "next/navigation";
import { listUsersUseCase } from "@/application/use-cases/auth";
import { AdminUsersClient } from "@/components/AdminUsersClient";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentSessionUser().catch(() => null);
  if (!user) {
    redirect("/connexion?next=/admin/utilisateurs");
  }

  if (user.role !== "ADMIN") {
    return (
      <section className="max-w-lg mx-auto bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
        <h1 className="font-display text-xl font-bold text-slate-900">
          Accès réservé aux administrateurs
        </h1>
        <p className="text-sm text-slate-600">
          Seul un administrateur peut attribuer les droits de responsable ou
          d&apos;administrateur.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg"
        >
          Retour aux signalements
        </Link>
      </section>
    );
  }

  let usersList: Awaited<ReturnType<typeof listUsersUseCase>> = [];
  let error: string | null = null;
  try {
    const { users } = getAppDeps();
    usersList = await listUsersUseCase({ users }, user);
  } catch {
    error = "Impossible de charger la liste des utilisateurs.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Gestion des utilisateurs et rôles
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Attribuez les rôles Responsable ou Administrateur aux comptes du
          campus.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800"
        >
          {error}
        </div>
      ) : (
        <AdminUsersClient initialUsers={usersList} currentAdminId={user.userId} />
      )}
    </div>
  );
}
