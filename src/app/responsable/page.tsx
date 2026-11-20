import Link from "next/link";
import { redirect } from "next/navigation";
import { listReportsUseCase } from "@/application/use-cases/reports";
import { StatusIndicator } from "@/components/StatusIndicator";
import { CATEGORY_LABELS, type ReportSummary } from "@/domain/types";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export default async function ManagerQueuePage() {
  const user = await getCurrentSessionUser().catch(() => null);
  if (!user) {
    redirect("/connexion?next=/responsable");
  }

  if (user.role !== "MANAGER" && user.role !== "ADMIN") {
    return (
      <section className="max-w-lg mx-auto bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
        <h1 className="font-display text-xl font-bold text-slate-900">
          Accès réservé aux responsables
        </h1>
        <p className="text-sm text-slate-600">
          Votre compte utilisateur ne dispose pas des droits nécessaires pour
          accéder à cette vue.
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

  let items: ReportSummary[] = [];
  let error: string | null = null;
  try {
    const { reports } = getAppDeps();
    items = await listReportsUseCase(
      { reports },
      user.role === "MANAGER" ? { assignedToId: user.userId } : {},
      user
    );
  } catch {
    error = "Impossible de charger vos interventions.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {user.role === "ADMIN"
            ? "Suivi global des interventions"
            : "Mes interventions assignées"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.role === "ADMIN"
            ? "Vue de supervision de l'ensemble des signalements."
            : "Signalements qui vous ont été attribués pour prise en charge et résolution."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Aucun signalement assigné
          </h2>
          <p className="text-sm text-slate-600">
            Aucun signalement ne vous est actuellement attribué.
          </p>
        </div>
      )}

      {!error && items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Signalement</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Lieu</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Soutiens</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {items.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {report.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {CATEGORY_LABELS[report.category]}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {report.location}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusIndicator status={report.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-nums text-slate-700">
                    {report.supportCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/signalements/${report.id}`}
                      className="inline-flex items-center justify-center min-h-[34px] px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-md whitespace-nowrap"
                    >
                      Traiter
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
