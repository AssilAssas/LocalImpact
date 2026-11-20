import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import {
  assertValidStatusTransition,
  canAssignReport,
} from "@/domain/report-rules";
import {
  findSimilarActiveReports,
  type SimilarityQuery,
} from "@/domain/similarity";
import { computeDashboardStats } from "@/domain/stats";
import type {
  CommentItem,
  DashboardStats,
  ReportDetail,
  ReportSummary,
  SessionUser,
  SimilarReportMatch,
  StatusHistoryItem,
} from "@/domain/types";
import type {
  FileStoragePort,
  ReportFilterInput,
  ReportRepository,
  UserRepository,
} from "../ports";
import {
  assignReportSchema,
  commentSchema,
  createReportSchema,
  reportFiltersSchema,
  transitionStatusSchema,
  validatePhotoFile,
} from "../validation";

export async function listReportsUseCase(
  deps: { reports: ReportRepository },
  rawFilters: Record<string, unknown>,
  viewer: SessionUser | null
): Promise<ReportSummary[]> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawFilters)) {
    if (typeof v === "string" && v.trim() !== "") {
      cleaned[k] = v;
    }
  }
  const parsed = reportFiltersSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Filtres de recherche invalides."
    );
  }

  const filters: ReportFilterInput = {
    ...parsed.data,
    viewerId: viewer?.userId ?? null,
  };
  return deps.reports.list(filters);
}

export async function getReportDetailUseCase(
  deps: { reports: ReportRepository },
  reportId: string,
  viewer: SessionUser | null
): Promise<ReportDetail> {
  const report = await deps.reports.findById(reportId, viewer?.userId ?? null);
  if (!report) {
    throw new NotFoundError("Signalement introuvable.");
  }
  return report;
}

export async function createReportUseCase(
  deps: { reports: ReportRepository; storage: FileStoragePort },
  actor: SessionUser | null,
  rawInput: unknown,
  photo?: { buffer: Buffer; mimeType: string; size: number } | null
): Promise<ReportDetail> {
  if (!actor) {
    throw new UnauthorizedError(
      "Vous devez être connecté pour créer un signalement."
    );
  }

  const parsed = createReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Données du signalement invalides."
    );
  }

  let photoPath: string | null = null;
  if (photo) {
    const fileError = validatePhotoFile({
      size: photo.size,
      type: photo.mimeType,
    });
    if (fileError) {
      throw new ValidationError(fileError);
    }
    photoPath = await deps.storage.saveImage({
      buffer: photo.buffer,
      mimeType: photo.mimeType,
    });
  }

  return deps.reports.createWithInitialHistory({
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    location: parsed.data.location,
    photoPath,
    authorId: actor.userId,
  });
}

export async function supportReportUseCase(
  deps: { reports: ReportRepository },
  actor: SessionUser | null,
  reportId: string
): Promise<{ supportCount: number }> {
  if (!actor) {
    throw new UnauthorizedError(
      "Vous devez être connecté pour soutenir un signalement."
    );
  }

  const existing = await deps.reports.findById(reportId, actor.userId);
  if (!existing) {
    throw new NotFoundError("Signalement introuvable.");
  }

  return deps.reports.addSupport(reportId, actor.userId);
}

export async function addCommentUseCase(
  deps: { reports: ReportRepository },
  actor: SessionUser | null,
  reportId: string,
  rawInput: unknown
): Promise<CommentItem> {
  if (!actor) {
    throw new UnauthorizedError(
      "Vous devez être connecté pour ajouter un commentaire."
    );
  }

  const parsed = commentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Commentaire invalide."
    );
  }

  const existing = await deps.reports.findById(reportId, actor.userId);
  if (!existing) {
    throw new NotFoundError("Signalement introuvable.");
  }

  return deps.reports.addComment({
    reportId,
    authorId: actor.userId,
    content: parsed.data.content,
  });
}

export async function assignReportUseCase(
  deps: { reports: ReportRepository; users: UserRepository },
  actor: SessionUser | null,
  reportId: string,
  rawInput: unknown
): Promise<ReportDetail> {
  if (!actor) {
    throw new UnauthorizedError();
  }
  if (!canAssignReport(actor)) {
    throw new ForbiddenError(
      "Seul un administrateur peut attribuer un signalement à un responsable."
    );
  }

  const parsed = assignReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Responsable invalide."
    );
  }

  const report = await deps.reports.findById(reportId, actor.userId);
  if (!report) {
    throw new NotFoundError("Signalement introuvable.");
  }

  const manager = await deps.users.findById(parsed.data.assignedToId);
  if (!manager) {
    throw new NotFoundError("Responsable introuvable.");
  }
  if (manager.role !== "MANAGER") {
    throw new ValidationError(
      "L'utilisateur sélectionné doit avoir le rôle Responsable."
    );
  }

  return deps.reports.assignManager(reportId, manager.id);
}

export async function transitionReportStatusUseCase(
  deps: { reports: ReportRepository },
  actor: SessionUser | null,
  reportId: string,
  rawInput: unknown
): Promise<{ report: ReportDetail; historyEntry: StatusHistoryItem }> {
  if (!actor) {
    throw new UnauthorizedError();
  }

  const parsed = transitionStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Transition de statut invalide."
    );
  }

  const report = await deps.reports.findById(reportId, actor.userId);
  if (!report) {
    throw new NotFoundError("Signalement introuvable.");
  }

  const { normalizedNote } = assertValidStatusTransition({
    actor,
    currentStatus: report.status,
    targetStatus: parsed.data.targetStatus,
    assignedToId: report.assignedToId,
    note: parsed.data.note,
  });

  const isResolving = parsed.data.targetStatus === "RESOLU";
  const resolvedAt = isResolving ? new Date() : null;
  const resolutionNote = isResolving ? normalizedNote : null;

  return deps.reports.transitionStatusAtomic({
    reportId,
    fromStatus: report.status,
    toStatus: parsed.data.targetStatus,
    note: normalizedNote,
    changedById: actor.userId,
    resolvedAt,
    resolutionNote,
  });
}

export async function findSimilarReportsUseCase(
  deps: { reports: ReportRepository },
  query: SimilarityQuery
): Promise<SimilarReportMatch[]> {
  const candidates = await deps.reports.listActiveCandidates();
  return findSimilarActiveReports(query, candidates, 5);
}

export async function getDashboardStatsUseCase(
  deps: { reports: ReportRepository }
): Promise<DashboardStats> {
  const records = await deps.reports.listStatRecords();
  return computeDashboardStats(records);
}
