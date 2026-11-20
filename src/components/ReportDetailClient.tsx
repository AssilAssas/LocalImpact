"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImageOff,
  MessageSquare,
  ThumbsUp,
  UserCheck,
} from "lucide-react";
import {
  commentSchema,
  transitionStatusSchema,
} from "@/application/validation";
import {
  canAdvanceReportStatus,
  getNextAllowedStatus,
} from "@/domain/report-rules";
import {
  CATEGORY_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  type ReportDetail,
  type SessionUser,
  type UserPublic,
} from "@/domain/types";
import { StatusIndicator } from "./StatusIndicator";

interface ReportDetailClientProps {
  initialReport: ReportDetail;
  viewer: SessionUser | null;
  managers: UserPublic[];
}

function formatDateTimeFr(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ReportDetailClient({
  initialReport,
  viewer,
  managers,
}: ReportDetailClientProps) {
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail>(initialReport);
  const [imageFailed, setImageFailed] = useState(false);

  const [supporting, setSupporting] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const [selectedManagerId, setSelectedManagerId] = useState(
    initialReport.assignedToId ?? ""
  );
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const [transitionNote, setTransitionNote] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const [commentContent, setCommentContent] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const nextStatus = getNextAllowedStatus(report.status);
  const canAdvance =
    viewer !== null &&
    canAdvanceReportStatus(viewer, { assignedToId: report.assignedToId });
  const isAdmin = viewer?.role === "ADMIN";

  async function handleSupport() {
    if (!viewer) {
      router.push(`/connexion?next=/signalements/${report.id}`);
      return;
    }
    setSupportError(null);
    setSupporting(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/support`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        supportCount?: number;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 409) {
          setReport((prev) => ({ ...prev, supportedByViewer: true }));
        }
        setSupportError(payload.error ?? "Impossible d'enregistrer votre soutien.");
        return;
      }
      setReport((prev) => ({
        ...prev,
        supportedByViewer: true,
        supportCount: payload.supportCount ?? prev.supportCount + 1,
      }));
    } catch {
      setSupportError("Erreur réseau lors du soutien.");
    } finally {
      setSupporting(false);
    }
  }

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignMessage(null);
    if (!selectedManagerId) {
      setAssignMessage("Veuillez sélectionner un responsable.");
      return;
    }
    setAssigning(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: selectedManagerId }),
      });
      const payload = (await response.json()) as {
        report?: ReportDetail;
        error?: string;
      };
      if (!response.ok || !payload.report) {
        setAssignMessage(payload.error ?? "Erreur lors de l'attribution.");
        return;
      }
      setReport(payload.report);
      setAssignMessage("Responsable attribué avec succès.");
      router.refresh();
    } catch {
      setAssignMessage("Erreur réseau lors de l'attribution.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleTransition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus) return;
    setTransitionError(null);

    const parsed = transitionStatusSchema.safeParse({
      targetStatus: nextStatus,
      note: transitionNote,
    });
    if (!parsed.success) {
      setTransitionError(
        parsed.error.issues[0]?.message ?? "Transition invalide."
      );
      return;
    }

    setTransitioning(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as {
        report?: ReportDetail;
        error?: string;
      };
      if (!response.ok || !payload.report) {
        setTransitionError(
          payload.error ?? "Impossible de mettre à jour le statut."
        );
        return;
      }
      setReport(payload.report);
      setTransitionNote("");
      router.refresh();
    } catch {
      setTransitionError("Erreur réseau lors du changement de statut.");
    } finally {
      setTransitioning(false);
    }
  }

  async function handleComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentError(null);
    const parsed = commentSchema.safeParse({ content: commentContent });
    if (!parsed.success) {
      setCommentError(
        parsed.error.issues[0]?.message ?? "Commentaire invalide."
      );
      return;
    }

    setCommenting(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as {
        comment?: ReportDetail["comments"][number];
        error?: string;
      };
      if (!response.ok || !payload.comment) {
        setCommentError(
          payload.error ?? "Impossible de publier le commentaire."
        );
        return;
      }
      setReport((prev) => ({
        ...prev,
        commentCount: prev.commentCount + 1,
        comments: [...prev.comments, payload.comment!],
      }));
      setCommentContent("");
    } catch {
      setCommentError("Erreur réseau lors de l'envoi du commentaire.");
    } finally {
      setCommenting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Retour aux signalements</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne principale : détails, photo, intervention, commentaires */}
        <div className="lg:col-span-8 space-y-6">
          <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
              <StatusIndicator status={report.status} />
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[report.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{report.location}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Créé le {formatDateTimeFr(report.createdAt)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {report.title}
              </h1>

              <button
                type="button"
                onClick={handleSupport}
                disabled={supporting || report.supportedByViewer}
                aria-pressed={report.supportedByViewer}
                className={`inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                  report.supportedByViewer
                    ? "bg-teal-50 border-teal-300 text-teal-800 cursor-default"
                    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                }`}
              >
                <ThumbsUp className="w-4 h-4" aria-hidden="true" />
                <span>
                  {report.supportedByViewer ? "Soutenu" : "Soutenir"}
                </span>
                <span className="font-mono-nums text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">
                  {report.supportCount}
                </span>
              </button>
            </div>

            {supportError && (
              <p
                role="alert"
                className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
              >
                {supportError}
              </p>
            )}

            <p className="text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {report.description}
            </p>

            {report.photoPath && (
              <div className="pt-2">
                {!imageFailed ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 max-w-xl">
                    <img
                      src={report.photoPath}
                      alt={`Illustration du signalement : ${report.title}`}
                      referrerPolicy="no-referrer"
                      onError={() => setImageFailed(true)}
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex items-center gap-3 text-sm text-slate-500 max-w-xl">
                    <ImageOff className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>La photo jointe n&apos;est plus accessible.</span>
                  </div>
                )}
              </div>
            )}

            {report.status === "RESOLU" && report.resolutionNote && (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <h2 className="text-sm font-semibold text-emerald-900">
                  Compte-rendu d&apos;intervention
                </h2>
                <p className="text-sm text-emerald-900/90 whitespace-pre-line">
                  {report.resolutionNote}
                </p>
                {report.resolvedAt && (
                  <p className="text-xs text-emerald-800 tabular-nums pt-1">
                    Résolu le {formatDateTimeFr(report.resolvedAt)}
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Déclaré par {report.authorName}</span>
              <span aria-hidden="true">·</span>
              <span>
                Responsable assigné :{" "}
                <strong className="font-medium text-slate-800">
                  {report.assignedToName ?? "Non attribué"}
                </strong>
              </span>
            </div>
          </article>

          {/* Commentaires */}
          <section
            aria-label="Commentaires et précisions"
            className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-2">
              <MessageSquare
                className="w-4 h-4 text-slate-500"
                aria-hidden="true"
              />
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Commentaires ({report.comments.length})
              </h2>
            </div>

            {report.comments.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucun commentaire pour le moment. Apportez des précisions si
                nécessaire.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.comments.map((comment) => (
                  <li key={comment.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">
                        {comment.authorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{ROLE_LABELS[comment.authorRole]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatDateTimeFr(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {comment.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {viewer ? (
              <form onSubmit={handleComment} noValidate className="pt-3 space-y-3">
                <div>
                  <label
                    htmlFor="comment-input"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Ajouter un commentaire
                  </label>
                  <textarea
                    id="comment-input"
                    rows={3}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Précisez la localisation, l'urgence ou l'évolution constatée..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>
                {commentError && (
                  <p role="alert" className="text-xs text-rose-700">
                    {commentError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={commenting}
                  className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
                >
                  {commenting ? "Envoi..." : "Publier le commentaire"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-600 pt-2 border-t border-slate-100">
                <Link
                  href={`/connexion?next=/signalements/${report.id}`}
                  className="font-semibold text-teal-700 underline underline-offset-4"
                >
                  Connectez-vous
                </Link>{" "}
                pour ajouter un commentaire ou soutenir ce signalement.
              </p>
            )}
          </section>
        </div>

        {/* Colonne latérale : Attribution Admin, Transition statut, Historique */}
        <aside className="lg:col-span-4 space-y-6">
          {isAdmin && (
            <section
              aria-label="Attribution à un responsable"
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <UserCheck
                  className="w-4 h-4 text-slate-600"
                  aria-hidden="true"
                />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Attribuer à un responsable
                </h2>
              </div>

              <form onSubmit={handleAssign} className="space-y-3">
                <div>
                  <label
                    htmlFor="assign-manager"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Responsable en charge
                  </label>
                  <select
                    id="assign-manager"
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="">Sélectionner un responsable</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                {assignMessage && (
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2">
                    {assignMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={assigning}
                  className="w-full min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
                >
                  {assigning ? "Attribution..." : "Enregistrer l'attribution"}
                </button>
              </form>
            </section>
          )}

          {canAdvance && nextStatus && (
            <section
              aria-label="Faire avancer le statut"
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <h2 className="font-display text-base font-semibold text-slate-900">
                Faire avancer le suivi
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="font-medium">
                  {STATUS_LABELS[report.status]}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-teal-700">
                  {STATUS_LABELS[nextStatus]}
                </span>
              </div>

              <form onSubmit={handleTransition} noValidate className="space-y-3">
                <div>
                  <label
                    htmlFor="transition-note"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {nextStatus === "RESOLU"
                      ? "Description de l'intervention (obligatoire, min. 10 car.)"
                      : "Note d'étape (facultative)"}
                  </label>
                  <textarea
                    id="transition-note"
                    rows={3}
                    required={nextStatus === "RESOLU"}
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder={
                      nextStatus === "RESOLU"
                        ? "Décrivez les réparations ou actions réalisées..."
                        : "Précision sur la prise en charge..."
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                {transitionError && (
                  <p
                    role="alert"
                    className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-2"
                  >
                    {transitionError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={transitioning}
                  className="w-full min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-60"
                >
                  {transitioning
                    ? "Mise à jour..."
                    : `Passer à « ${STATUS_LABELS[nextStatus]} »`}
                </button>
              </form>
            </section>
          )}

          {/* Historique des changements */}
          <section
            aria-label="Historique des changements"
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h2 className="font-display text-base font-semibold text-slate-900">
              Historique des changements
            </h2>

            {report.history.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aucun événement enregistré.
              </p>
            ) : (
              <ol className="space-y-4">
                {report.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-900">
                      {entry.fromStatus ? (
                        <>
                          <span className="text-slate-600 font-medium">
                            {STATUS_LABELS[entry.fromStatus]}
                          </span>
                          <ArrowRight
                            className="w-3 h-3 text-slate-400"
                            aria-hidden="true"
                          />
                          <span className="text-teal-700">
                            {STATUS_LABELS[entry.toStatus]}
                          </span>
                        </>
                      ) : (
                        <span className="text-teal-700">
                          {STATUS_LABELS[entry.toStatus]}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 tabular-nums">
                      {formatDateTimeFr(entry.createdAt)} ·{" "}
                      {entry.changedByName} ({ROLE_LABELS[entry.changedByRole]})
                    </div>

                    {entry.note && (
                      <p className="text-xs text-slate-700 pt-0.5">
                        {entry.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
