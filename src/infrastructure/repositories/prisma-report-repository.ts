import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateReportRepoInput,
  ReportFilterInput,
  ReportRepository,
  TransitionStatusRepoInput,
} from "@/application/ports";
import { ConflictError } from "@/domain/errors";
import type { ReportStatRecord } from "@/domain/stats";
import type {
  Category,
  CommentItem,
  ReportDetail,
  ReportStatus,
  ReportSummary,
  Role,
  SimilarReportCandidate,
  StatusHistoryItem,
} from "@/domain/types";

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  private buildSummaryInclude(viewerId?: string | null) {
    return {
      author: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { supports: true, comments: true } },
      supports: viewerId
        ? { where: { userId: viewerId }, select: { id: true } }
        : false,
    } as const;
  }

  private mapSummary(row: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    photoPath: string | null;
    status: string;
    resolutionNote: string | null;
    resolvedAt: Date | null;
    authorId: string;
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string };
    assignedTo: { id: string; name: string } | null;
    _count: { supports: number; comments: number };
    supports?: { id: string }[];
  }): ReportSummary {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category as Category,
      location: row.location,
      photoPath: row.photoPath,
      status: row.status as ReportStatus,
      resolutionNote: row.resolutionNote,
      resolvedAt: row.resolvedAt,
      authorId: row.authorId,
      authorName: row.author.name,
      assignedToId: row.assignedToId,
      assignedToName: row.assignedTo?.name ?? null,
      supportCount: row._count.supports,
      commentCount: row._count.comments,
      supportedByViewer: Array.isArray(row.supports) && row.supports.length > 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(filters: ReportFilterInput): Promise<ReportSummary[]> {
    const where: Prisma.ReportWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: "insensitive",
      };
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const rows = await this.db.report.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: this.buildSummaryInclude(filters.viewerId),
    });

    return rows.map((row) => this.mapSummary(row));
  }

  async findById(
    id: string,
    viewerId?: string | null
  ): Promise<ReportDetail | null> {
    const row = await this.db.report.findUnique({
      where: { id },
      include: {
        ...this.buildSummaryInclude(viewerId),
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
        history: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!row) return null;

    return {
      ...this.mapSummary(row),
      comments: row.comments.map((c) => ({
        id: c.id,
        content: c.content,
        reportId: c.reportId,
        authorId: c.authorId,
        authorName: c.author.name,
        authorRole: c.author.role as Role,
        createdAt: c.createdAt,
      })),
      history: row.history.map((h) => ({
        id: h.id,
        reportId: h.reportId,
        fromStatus: (h.fromStatus as ReportStatus | null) ?? null,
        toStatus: h.toStatus as ReportStatus,
        note: h.note,
        changedById: h.changedById,
        changedByName: h.changedBy.name,
        changedByRole: h.changedBy.role as Role,
        createdAt: h.createdAt,
      })),
    };
  }

  async createWithInitialHistory(
    input: CreateReportRepoInput
  ): Promise<ReportDetail> {
    const createdId = await this.db.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          location: input.location,
          photoPath: input.photoPath,
          status: "NOUVEAU",
          authorId: input.authorId,
        },
      });

      await tx.statusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: input.authorId,
        },
      });

      return report.id;
    });

    const detail = await this.findById(createdId, input.authorId);
    if (!detail) {
      throw new Error("Impossible de relire le signalement créé.");
    }
    return detail;
  }

  async addSupport(
    reportId: string,
    userId: string
  ): Promise<{ supportCount: number }> {
    try {
      await this.db.support.create({
        data: {
          reportId,
          userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("Vous avez déjà soutenu ce signalement.");
      }
      throw error;
    }

    const supportCount = await this.db.support.count({
      where: { reportId },
    });

    return { supportCount };
  }

  async addComment(input: {
    reportId: string;
    authorId: string;
    content: string;
  }): Promise<CommentItem> {
    const comment = await this.db.comment.create({
      data: {
        reportId: input.reportId,
        authorId: input.authorId,
        content: input.content,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      reportId: comment.reportId,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorRole: comment.author.role as Role,
      createdAt: comment.createdAt,
    };
  }

  async assignManager(
    reportId: string,
    managerId: string
  ): Promise<ReportDetail> {
    await this.db.report.update({
      where: { id: reportId },
      data: { assignedToId: managerId },
    });

    const detail = await this.findById(reportId, null);
    if (!detail) {
      throw new Error("Signalement introuvable après attribution.");
    }
    return detail;
  }

  async transitionStatusAtomic(
    input: TransitionStatusRepoInput
  ): Promise<{ report: ReportDetail; historyEntry: StatusHistoryItem }> {
    const historyRow = await this.db.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: input.reportId },
        data: {
          status: input.toStatus,
          ...(input.toStatus === "RESOLU"
            ? {
                resolvedAt: input.resolvedAt ?? new Date(),
                resolutionNote: input.resolutionNote,
              }
            : {}),
        },
      });

      return tx.statusHistory.create({
        data: {
          reportId: input.reportId,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          note: input.note,
          changedById: input.changedById,
        },
        include: {
          changedBy: { select: { id: true, name: true, role: true } },
        },
      });
    });

    const detail = await this.findById(input.reportId, input.changedById);
    if (!detail) {
      throw new Error("Signalement introuvable après transition.");
    }

    return {
      report: detail,
      historyEntry: {
        id: historyRow.id,
        reportId: historyRow.reportId,
        fromStatus: (historyRow.fromStatus as ReportStatus | null) ?? null,
        toStatus: historyRow.toStatus as ReportStatus,
        note: historyRow.note,
        changedById: historyRow.changedById,
        changedByName: historyRow.changedBy.name,
        changedByRole: historyRow.changedBy.role as Role,
        createdAt: historyRow.createdAt,
      },
    };
  }

  async listActiveCandidates(): Promise<SimilarReportCandidate[]> {
    const rows = await this.db.report.findMany({
      where: { status: { not: "RESOLU" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        category: true,
        location: true,
        status: true,
        createdAt: true,
        _count: { select: { supports: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category as Category,
      location: row.location,
      status: row.status as ReportStatus,
      supportCount: row._count.supports,
      createdAt: row.createdAt,
    }));
  }

  async listStatRecords(): Promise<ReportStatRecord[]> {
    const rows = await this.db.report.findMany({
      select: {
        status: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        _count: { select: { supports: true } },
      },
    });

    return rows.map((row) => ({
      status: row.status as ReportStatus,
      category: row.category as Category,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      supportCount: row._count.supports,
    }));
  }
}
