import { ForbiddenError, ValidationError } from "./errors";
import type { ReportStatus, SessionUser } from "./types";

export const MIN_RESOLUTION_NOTE_LENGTH = 10;

export const NEXT_STATUS_MAP: Record<ReportStatus, ReportStatus | null> = {
  NOUVEAU: "PRIS_EN_CHARGE",
  PRIS_EN_CHARGE: "EN_COURS",
  EN_COURS: "RESOLU",
  RESOLU: null,
};

export function getNextAllowedStatus(current: ReportStatus): ReportStatus | null {
  return NEXT_STATUS_MAP[current];
}

export function canTransitionStatus(
  current: ReportStatus,
  target: ReportStatus
): boolean {
  return NEXT_STATUS_MAP[current] === target;
}

export function canAdvanceReportStatus(
  actor: Pick<SessionUser, "userId" | "role">,
  report: { assignedToId: string | null }
): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }
  if (actor.role === "MANAGER") {
    return report.assignedToId !== null && report.assignedToId === actor.userId;
  }
  return false;
}

export function canAssignReport(actor: Pick<SessionUser, "role">): boolean {
  return actor.role === "ADMIN";
}

export function canManageUserRoles(actor: Pick<SessionUser, "role">): boolean {
  return actor.role === "ADMIN";
}

export function assertValidStatusTransition(params: {
  actor: Pick<SessionUser, "userId" | "role">;
  currentStatus: ReportStatus;
  targetStatus: ReportStatus;
  assignedToId: string | null;
  note?: string | null;
}): { normalizedNote: string | null } {
  if (!canAdvanceReportStatus(params.actor, { assignedToId: params.assignedToId })) {
    throw new ForbiddenError(
      "Seul le responsable assigné à ce signalement ou un administrateur peut modifier son statut."
    );
  }

  if (!canTransitionStatus(params.currentStatus, params.targetStatus)) {
    const expected = getNextAllowedStatus(params.currentStatus);
    if (!expected) {
      throw new ValidationError(
        "Ce signalement est déjà résolu et ne peut plus changer de statut."
      );
    }
    throw new ValidationError(
      `Transition de statut invalide (${params.currentStatus} → ${params.targetStatus}). Seule la transition vers ${expected} est autorisée.`
    );
  }

  const trimmedNote = params.note?.trim() ?? "";

  if (params.targetStatus === "RESOLU") {
    if (trimmedNote.length < MIN_RESOLUTION_NOTE_LENGTH) {
      throw new ValidationError(
        `Une description de l'intervention d'au moins ${MIN_RESOLUTION_NOTE_LENGTH} caractères est obligatoire pour résoudre un signalement.`
      );
    }
  }

  return {
    normalizedNote: trimmedNote.length > 0 ? trimmedNote : null,
  };
}
