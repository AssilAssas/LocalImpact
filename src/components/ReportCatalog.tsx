"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search, ThumbsUp, MessageSquare, RotateCcw } from "lucide-react";
import {
  CAMPUS_LOCATIONS,
  CATEGORIES,
  CATEGORY_LABELS,
  REPORT_STATUSES,
  STATUS_LABELS,
  type Category,
  type ReportStatus,
  type ReportSummary,
} from "@/domain/types";
import { StatusIndicator } from "./StatusIndicator";

interface ReportCatalogProps {
  initialReports: ReportSummary[];
  initialError?: string | null;
}

function formatDateFr(dateValue: Date | string): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ReportCatalog({
  initialReports,
  initialError = null,
}: ReportCatalogProps) {
  const [reports, setReports] = useState<ReportSummary[]>(initialReports);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [hasFilteredOnce, setHasFilteredOnce] = useState(false);

  const fetchFiltered = useCallback(
    async (params: {
      search: string;
      category: Category | "";
      status: ReportStatus | "";
      location: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (params.search.trim()) qs.set("search", params.search.trim());
        if (params.category) qs.set("category", params.category);
        if (params.status) qs.set("status", params.status);
        if (params.location.trim()) qs.set("location", params.location.trim());

        const response = await fetch(`/api/reports?${qs.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          reports?: ReportSummary[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Impossible de charger les signalements.");
          return;
        }
        setReports(payload.reports ?? []);
      } catch {
        setError("Erreur réseau lors du chargement des signalements.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!hasFilteredOnce) return;
    const handle = setTimeout(() => {
      void fetchFiltered({ search, category, status, location });
    }, 220);
    return () => clearTimeout(handle);
  }, [search, category, status, location, hasFilteredOnce, fetchFiltered]);

  function resetFilters() {
    setHasFilteredOnce(true);
    setSearch("");
    setCategory("");
    setStatus("");
    setLocation("");
  }

  const hasActiveFilters = Boolean(search || category || status || location);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Signalements du campus
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Consultez les problèmes déclarés, soutenez ceux qui vous concernent
            et suivez leur prise en charge.
          </p>
        </div>

        <Link
          href="/signalements/nouveau"
          className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700"
        >
          Nouveau signalement
        </Link>
      </div>

      {/* Barre de recherche et filtres */}
      <section
        aria-label="Filtrer les signalements"
        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <label htmlFor="filter-search" className="sr-only">
              Rechercher un signalement
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="filter-search"
              type="search"
              value={search}
              onChange={(e) => {
                setHasFilteredOnce(true);
                setSearch(e.target.value);
              }}
              placeholder="Rechercher par titre, description ou lieu..."
              className="w-full min-h-[42px] pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          <div>
            <label htmlFor="filter-category" className="sr-only">
              Filtrer par catégorie
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setHasFilteredOnce(true);
                setCategory(e.target.value as Category | "");
              }}
              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-location" className="sr-only">
              Filtrer par lieu
            </label>
            <input
              id="filter-location"
              list="campus-locations-filter"
              value={location}
              onChange={(e) => {
                setHasFilteredOnce(true);
                setLocation(e.target.value);
              }}
              placeholder="Lieu (ex. Bâtiment A)"
              className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
            <datalist id="campus-locations-filter">
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Onglets de statut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div
            role="group"
            aria-label="Filtrer par statut"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              onClick={() => {
                setHasFilteredOnce(true);
                setStatus("");
              }}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                status === ""
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous
            </button>
            {REPORT_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setHasFilteredOnce(true);
                  setStatus(s);
                }}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                  status === s
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </section>

      {/* État d'erreur */}
      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <p className="text-sm text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => fetchFiltered({ search, category, status, location })}
            className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-rose-800 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État de chargement */}
      {loading && (
        <div aria-busy="true" className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse space-y-3"
            >
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {!loading && !error && reports.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Aucun signalement trouvé
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {hasActiveFilters
              ? "Aucun signalement ne correspond à vos critères actuels."
              : "Aucun problème n'a encore été déclaré sur cette plateforme."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Effacer les filtres
              </button>
            ) : (
              <Link
                href="/signalements/nouveau"
                className="inline-flex items-center min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                Créer le premier signalement
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Liste des signalements */}
      {!loading && !error && reports.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {reports.map((report) => (
            <article
              key={report.id}
              className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                  <StatusIndicator status={report.status} />
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[report.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[220px]">
                    {report.location}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatDateFr(report.createdAt)}
                  </span>
                </div>

                <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
                  <Link
                    href={`/signalements/${report.id}`}
                    className="hover:text-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
                  >
                    {report.title}
                  </Link>
                </h2>

                <p className="text-sm text-slate-600 line-clamp-2 max-w-3xl">
                  {report.description}
                </p>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                  <span>Par {report.authorName}</span>
                  {report.assignedToName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Suivi par {report.assignedToName}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 tabular-nums">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      report.supportedByViewer ? "text-teal-700 font-semibold" : ""
                    }`}
                    title="Soutiens"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{report.supportCount}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5"
                    title="Commentaires"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{report.commentCount}</span>
                  </span>
                </div>

                <Link
                  href={`/signalements/${report.id}`}
                  className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  Consulter
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
