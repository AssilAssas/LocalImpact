import crypto from "node:crypto";
import type {
  CreateReportRepoInput,
  FileStoragePort,
  PasswordHasherPort,
  ReportFilterInput,
  ReportRepository,
  TransitionStatusRepoInput,
  UserRepository,
} from "@/application/ports";
import { ConflictError, NotFoundError } from "@/domain/errors";
import type { ReportStatRecord } from "@/domain/stats";
import type {
  CommentItem,
  ReportDetail,
  ReportSummary,
  Role,
  SimilarReportCandidate,
  StatusHistoryItem,
  UserPublic,
  UserWithSecret,
} from "@/domain/types";

export class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

export class InMemoryFileStorage implements FileStoragePort {
  public readonly files = new Map<
    string,
    { buffer: Buffer; mimeType: string }
  >();

  async saveImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<string> {
    const ext =
      input.mimeType === "image/png"
        ? "png"
        : input.mimeType === "image/webp"
          ? "webp"
          : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    this.files.set(filename, input);
    return `/api/uploads/${filename}`;
  }

  async readImage(
    filename: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    return this.files.get(filename) ?? null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private users: UserWithSecret[] = [];

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }

  async findById(id: string): Promise<UserPublic | null> {
    const found = this.users.find((u) => u.id === id);
    if (!found) return null;
    const { passwordHash: _, ...pub } = found;
    return pub;
  }

  async listAll(): Promise<UserPublic[]> {
    return this.users.map(({ passwordHash: _, ...pub }) => pub);
  }

  async listManagers(): Promise<UserPublic[]> {
    return this.users
      .filter((u) => u.role === "MANAGER")
      .map(({ passwordHash: _, ...pub }) => pub);
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserPublic> {
    const user: UserWithSecret = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: new Date(),
    };
    this.users.push(user);
    const { passwordHash: _, ...pub } = user;
    return pub;
  }

  async updateRole(userId: string, role: Role): Promise<UserPublic> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new NotFoundError("Utilisateur introuvable.");
    user.role = role;
    const { passwordHash: _, ...pub } = user;
    return pub;
  }
}

export class InMemoryReportRepository implements ReportRepository {
  private reports: Array<{
    id: string;
    title: string;
    description: string;
    category: ReportSummary["category"];
    location: string;
    photoPath: string | null;
    status: ReportSummary["status"];
    resolutionNote: string | null;
    resolvedAt: Date | null;
    authorId: string;
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  private supports = new Set<string>(); // `${reportId}:${userId}`
  private comments: CommentItem[] = [];
  private history: StatusHistoryItem[] = [];

  constructor(private readonly usersRepo: InMemoryUserRepository) {}

  private async toSummary(
    r: (typeof this.reports)[number],
    viewerId?: string | null
  ): Promise<ReportSummary> {
    const author = await this.usersRepo.findById(r.authorId);
    const assignee = r.assignedToId
      ? await this.usersRepo.findById(r.assignedToId)
      : null;

    let supportCount = 0;
    for (const key of this.supports) {
      if (key.startsWith(`${r.id}:`)) supportCount += 1;
    }

    const commentCount = this.comments.filter((c) => c.reportId === r.id).length;
    const supportedByViewer = viewerId
      ? this.supports.has(`${r.id}:${viewerId}`)
      : false;

    return {
      ...r,
      authorName: author?.name ?? "Inconnu",
      assignedToName: assignee?.name ?? null,
      supportCount,
      commentCount,
      supportedByViewer,
    };
  }

  async list(filters: ReportFilterInput): Promise<ReportSummary[]> {
    const filtered = this.reports.filter((r) => {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (
        filters.location &&
        !r.location.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        return false;
      }
      if (filters.assignedToId && r.assignedToId !== filters.assignedToId) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    const summaries = await Promise.all(
      filtered.map((r) => this.toSummary(r, filters.viewerId))
    );
    return summaries.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findById(
    id: string,
    viewerId?: string | null
  ): Promise<ReportDetail | null> {
    const r = this.reports.find((item) => item.id === id);
    if (!r) return null;
    const summary = await this.toSummary(r, viewerId);
    return {
      ...summary,
      comments: this.comments.filter((c) => c.reportId === id),
      history: this.history.filter((h) => h.reportId === id),
    };
  }

  async createWithInitialHistory(
    input: CreateReportRepoInput
  ): Promise<ReportDetail> {
    const now = new Date();
    const id = crypto.randomUUID();
    const author = await this.usersRepo.findById(input.authorId);

    this.reports.push({
      id,
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      photoPath: input.photoPath,
      status: "NOUVEAU",
      resolutionNote: null,
      resolvedAt: null,
      authorId: input.authorId,
      assignedToId: null,
      createdAt: now,
      updatedAt: now,
    });

    this.history.push({
      id: crypto.randomUUID(),
      reportId: id,
      fromStatus: null,
      toStatus: "NOUVEAU",
      note: "Signalement créé.",
      changedById: input.authorId,
      changedByName: author?.name ?? "Inconnu",
      changedByRole: author?.role ?? "USER",
      createdAt: now,
    });

    const detail = await this.findById(id, input.authorId);
    if (!detail) throw new Error("Erreur création in-memory");
    return detail;
  }

  async addSupport(
    reportId: string,
    userId: string
  ): Promise<{ supportCount: number }> {
    const key = `${reportId}:${userId}`;
    if (this.supports.has(key)) {
      throw new ConflictError("Vous avez déjà soutenu ce signalement.");
    }
    this.supports.add(key);

    let supportCount = 0;
    for (const s of this.supports) {
      if (s.startsWith(`${reportId}:`)) supportCount += 1;
    }
    return { supportCount };
  }

  async addComment(input: {
    reportId: string;
    authorId: string;
    content: string;
  }): Promise<CommentItem> {
    const author = await this.usersRepo.findById(input.authorId);
    const comment: CommentItem = {
      id: crypto.randomUUID(),
      reportId: input.reportId,
      authorId: input.authorId,
      authorName: author?.name ?? "Inconnu",
      authorRole: author?.role ?? "USER",
      content: input.content,
      createdAt: new Date(),
    };
    this.comments.push(comment);
    return comment;
  }

  async assignManager(
    reportId: string,
    managerId: string
  ): Promise<ReportDetail> {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) throw new NotFoundError("Signalement introuvable.");
    report.assignedToId = managerId;
    report.updatedAt = new Date();
    const detail = await this.findById(reportId, null);
    if (!detail) throw new NotFoundError("Signalement introuvable.");
    return detail;
  }

  async transitionStatusAtomic(
    input: TransitionStatusRepoInput
  ): Promise<{ report: ReportDetail; historyEntry: StatusHistoryItem }> {
    const report = this.reports.find((r) => r.id === input.reportId);
    if (!report) throw new NotFoundError("Signalement introuvable.");

    const actor = await this.usersRepo.findById(input.changedById);

    report.status = input.toStatus;
    report.updatedAt = new Date();
    if (input.toStatus === "RESOLU") {
      report.resolvedAt = input.resolvedAt ?? new Date();
      report.resolutionNote = input.resolutionNote;
    }

    const historyEntry: StatusHistoryItem = {
      id: crypto.randomUUID(),
      reportId: input.reportId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      note: input.note,
      changedById: input.changedById,
      changedByName: actor?.name ?? "Inconnu",
      changedByRole: actor?.role ?? "ADMIN",
      createdAt: new Date(),
    };
    this.history.push(historyEntry);

    const detail = await this.findById(input.reportId, input.changedById);
    if (!detail) throw new NotFoundError("Signalement introuvable.");

    return { report: detail, historyEntry };
  }

  async listActiveCandidates(): Promise<SimilarReportCandidate[]> {
    const items = await this.list({});
    return items
      .filter((r) => r.status !== "RESOLU")
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        location: r.location,
        status: r.status,
        supportCount: r.supportCount,
        createdAt: r.createdAt,
      }));
  }

  async listStatRecords(): Promise<ReportStatRecord[]> {
    const items = await this.list({});
    return items.map((r) => ({
      status: r.status,
      category: r.category,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      supportCount: r.supportCount,
    }));
  }
}
