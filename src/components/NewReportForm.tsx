"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImagePlus, ThumbsUp, X } from "lucide-react";
import {
  createReportSchema,
  validatePhotoFile,
} from "@/application/validation";
import {
  CAMPUS_LOCATIONS,
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type SimilarReportMatch,
} from "@/domain/types";
import { StatusIndicator } from "./StatusIndicator";

export function NewReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("MATERIEL");
  const [locationChoice, setLocationChoice] = useState<string>(
    CAMPUS_LOCATIONS[0]
  );
  const [customLocation, setCustomLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [similarReports, setSimilarReports] = useState<SimilarReportMatch[]>(
    []
  );
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [supportingId, setSupportingId] = useState<string | null>(null);
  const [dismissedSimilar, setDismissedSimilar] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveLocation =
    locationChoice === "__OTHER__" ? customLocation.trim() : locationChoice;

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 && effectiveLocation.length < 2) {
      setSimilarReports([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingSimilar(true);
      try {
        const qs = new URLSearchParams();
        if (trimmedTitle) qs.set("title", trimmedTitle);
        if (category) qs.set("category", category);
        if (effectiveLocation) qs.set("location", effectiveLocation);

        const response = await fetch(`/api/reports/similar?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          similar?: SimilarReportMatch[];
        };
        setSimilarReports(payload.similar ?? []);
        setDismissedSimilar(false);
      } catch {
        // Ignorer les annulations d'abort controller
      } finally {
        setCheckingSimilar(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, category, effectiveLocation]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhoto(null);
      return;
    }
    const fileError = validatePhotoFile({ size: file.size, type: file.type });
    if (fileError) {
      setError(fileError);
      event.target.value = "";
      setPhoto(null);
      return;
    }
    setPhoto(file);
  }

  async function handleSupportExisting(reportId: string) {
    setError(null);
    setSupportingId(reportId);
    try {
      const response = await fetch(`/api/reports/${reportId}/support`, {
        method: "POST",
      });
      if (response.ok || response.status === 409) {
        router.push(`/signalements/${reportId}`);
        router.refresh();
        return;
      }
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Impossible de soutenir ce signalement.");
    } catch {
      setError("Erreur réseau lors du soutien.");
    } finally {
      setSupportingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = createReportSchema.safeParse({
      title,
      description,
      category,
      location: effectiveLocation,
    });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Veuillez vérifier vos champs."
      );
      return;
    }

    if (photo) {
      const fileError = validatePhotoFile({
        size: photo.size,
        type: photo.type,
      });
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", parsed.data.title);
      formData.append("description", parsed.data.description);
      formData.append("category", parsed.data.category);
      formData.append("location", parsed.data.location);
      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        report?: { id: string };
        error?: string;
      };
      if (!response.ok || !payload.report) {
        setError(payload.error ?? "Impossible de créer le signalement.");
        return;
      }

      router.push(`/signalements/${payload.report.id}`);
      router.refresh();
    } catch {
      setError("Erreur réseau lors de la publication.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Nouveau signalement
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Décrivez le problème observé sur le campus afin qu&apos;il soit pris
            en charge par l&apos;équipe concernée.
          </p>
        </div>

        <div>
          <label
            htmlFor="report-title"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Titre du signalement
          </label>
          <input
            id="report-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Vidéoprojecteur en panne en salle B102"
            className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="report-category"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Catégorie
            </label>
            <select
              id="report-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-location-select"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Lieu sur le campus
            </label>
            <select
              id="report-location-select"
              value={locationChoice}
              onChange={(e) => setLocationChoice(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            >
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="__OTHER__">Autre lieu (préciser)</option>
            </select>
          </div>
        </div>

        {locationChoice === "__OTHER__" && (
          <div>
            <label
              htmlFor="report-custom-location"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Précisez le lieu
            </label>
            <input
              id="report-custom-location"
              type="text"
              required
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Ex. Couloir 2e étage, aile C"
              className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="report-description"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Description détaillée
          </label>
          <textarea
            id="report-description"
            name="description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez précisément le problème constaté, l'équipement concerné et son impact..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
          />
        </div>

        <div>
          <label
            htmlFor="report-photo"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Photo (facultative, JPEG / PNG / WebP, max 5 Mo)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="report-photo"
              className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              <ImagePlus className="w-4 h-4" aria-hidden="true" />
              <span>{photo ? "Changer la photo" : "Ajouter une photo"}</span>
            </label>
            <input
              id="report-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
            />
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retirer ({photo.name})</span>
              </button>
            )}
          </div>

          {photoPreviewUrl && (
            <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden max-w-xs bg-slate-50">
              <img
                src={photoPreviewUrl}
                alt="Aperçu de la photo sélectionnée"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover"
              />
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700 disabled:opacity-60"
          >
            {submitting ? "Publication..." : "Publier le signalement"}
          </button>
        </div>
      </form>

      {/* Panneau latéral : Détection de signalements actifs similaires */}
      <aside
        aria-label="Vérification des doublons actifs"
        className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Signalements actifs similaires
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Soutenez un signalement déjà ouvert pour éviter les doublons, ou
              poursuivez votre création.
            </p>
          </div>
          {checkingSimilar && (
            <span className="text-xs text-slate-500 whitespace-nowrap">
              Analyse...
            </span>
          )}
        </div>

        {similarReports.length === 0 || dismissedSimilar ? (
          <div className="py-6 px-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            {dismissedSimilar
              ? "Suggestions masquées. Vous pouvez finaliser votre signalement."
              : "Aucun signalement actif proche détecté pour cette saisie."}
          </div>
        ) : (
          <div className="space-y-3">
            {similarReports.map((match) => (
              <div
                key={match.id}
                className="p-4 border border-slate-200 rounded-lg space-y-2.5 bg-slate-50/50"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <StatusIndicator status={match.status} />
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[match.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{match.location}</span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900">
                  <Link
                    href={`/signalements/${match.id}`}
                    className="hover:text-teal-700 underline-offset-4 hover:underline"
                  >
                    {match.title}
                  </Link>
                </h3>

                <p className="text-xs text-slate-600">
                  Correspondance : {match.reasons.join(" · ")}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-600 tabular-nums">
                    {match.supportCount} soutien
                    {match.supportCount > 1 ? "s" : ""}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/signalements/${match.id}`}
                      className="inline-flex items-center min-h-[34px] px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md"
                    >
                      Voir
                    </Link>
                    <button
                      type="button"
                      disabled={supportingId === match.id}
                      onClick={() => handleSupportExisting(match.id)}
                      className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors disabled:opacity-60"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {supportingId === match.id
                          ? "Envoi..."
                          : "Soutenir celui-ci"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDismissedSimilar(true)}
              className="w-full min-h-[36px] text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Ce n&apos;est pas le même problème — continuer ma création
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
