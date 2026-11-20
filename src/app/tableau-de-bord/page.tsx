import Link from "next/link";
import { getDashboardStatsUseCase } from "@/application/use-cases/reports";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  REPORT_STATUSES,
  STATUS_LABELS,
  type DashboardStats,
} from "@/domain/types";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

function formatHours(hours: number | null): string {
  if (hours === null) return "Aucun signalement résolu";
  return `${hours.toFixed(1).replace(".", ",")} h`;
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default async function DashboardPage() {
  let stats: DashboardStats | null = null;
  let dbError: string | null = null;

  try {
    const { reports } = getAppDeps();
    stats = await getDashboardStatsUseCase({ reports });
  } catch {
    dbError =
      "Impossible de calculer les statistiques : la base de données PostgreSQL est indisponible.";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Indicateurs calculés en direct à partir des signalements persistés.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Voir tous les signalements
        </Link>
      </div>

      {dbError && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm text-rose-800"
        >
          {dbError}
        </div>
      )}

      {stats && (
        <>
          {/* Bandeau KPI (4 colonnes) */}
          <section
            aria-label="Indicateurs clés"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
          >
            <div className="p-6 space-y-1">
              <p className="text-xs font-medium text-slate-500">
                Signalements totaux
              </p>
              <p className="font-mono-nums text-3xl font-semibold text-slate-900">
                {stats.totalReports}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {stats.totalSupports} soutien
                {stats.totalSupports > 1 ? "s" : ""} cumulé
                {stats.totalSupports > 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-6 space-y-1">
              <p className="text-xs font-medium text-slate-500">
                Signalements actifs
              </p>
              <p className="font-mono-nums text-3xl font-semibold text-teal-700">
                {stats.activeReports}
              </p>
              <p className="text-xs text-slate-500">
                En attente ou en cours de traitement
              </p>
            </div>

            <div className="p-6 space-y-1">
              <p className="text-xs font-medium text-slate-500">
                Signalements résolus
              </p>
              <p className="font-mono-nums text-3xl font-semibold text-emerald-700">
                {stats.resolvedReports}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {percentage(stats.resolvedReports, stats.totalReports)} % du
                total
              </p>
            </div>

            <div className="p-6 space-y-1">
              <p className="text-xs font-medium text-slate-500">
                Délai moyen de résolution
              </p>
              <p className="font-mono-nums text-2xl font-semibold text-slate-900">
                {formatHours(stats.averageResolutionHours)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {stats.medianResolutionHours !== null
                  ? `Médiane : ${formatHours(stats.medianResolutionHours)}`
                  : "Calculé de la création à la résolution"}
              </p>
            </div>
          </section>

          {/* Répartitions par statut et par catégorie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section
              aria-label="Répartition par statut"
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Répartition par statut
                </h2>
                <p className="text-xs text-slate-500">
                  Suivi du cycle de vie des signalements
                </p>
              </div>

              <div className="space-y-4">
                {REPORT_STATUSES.map((status) => {
                  const count = stats.byStatus[status];
                  const pct = percentage(count, stats.totalReports);
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="font-mono-nums text-xs text-slate-600">
                          {count} ({pct} %)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            status === "RESOLU"
                              ? "bg-emerald-600"
                              : status === "EN_COURS"
                                ? "bg-teal-600"
                                : status === "PRIS_EN_CHARGE"
                                  ? "bg-sky-600"
                                  : "bg-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              aria-label="Répartition par catégorie"
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Répartition par catégorie
                </h2>
                <p className="text-xs text-slate-500">
                  Volume d&apos;incidents par domaine du campus
                </p>
              </div>

              <div className="space-y-4">
                {CATEGORIES.map((category) => {
                  const count = stats.byCategory[category];
                  const pct = percentage(count, stats.totalReports);
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">
                          {CATEGORY_LABELS[category]}
                        </span>
                        <span className="font-mono-nums text-xs text-slate-600">
                          {count} ({pct} %)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
