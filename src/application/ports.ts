import type {
  Category,
  CommentItem,
  ReportDetail,
  ReportStatus,
  ReportSummary,
  Role,
  SessionUser,
  SimilarReportCandidate,
  StatusHistoryItem,
  UserPublic,
  UserWithSecret,
} from "@/domain/types";
import type { ReportStatRecord } from "@/domain/stats";

export interface ReportFilterInput {
  search?: string;
  category?: Category;
  status?: ReportStatus;
  location?: string;
  assignedToId?: string;
  viewerId?: string | null;
}

export interface CreateReportRepoInput {
  title: string;
  description: string;
  category: Category;
  location: string;
  photoPath: string | null;
  authorId: string;
}

export interface TransitionStatusRepoInput {
  reportId: string;
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  note: string | null;
  changedById: string;
  resolvedAt: Date | null;
  resolutionNote: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithSecret | null>;
  findById(id: string): Promise<UserPublic | null>;
  listAll(): Promise<UserPublic[]>;
  listManagers(): Promise<UserPublic[]>;
  createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserPublic>;
  updateRole(userId: string, role: Role): Promise<UserPublic>;
}

export interface ReportRepository {
  list(filters: ReportFilterInput): Promise<ReportSummary[]>;
  findById(
    id: string,
    viewerId?: string | null
  ): Promise<ReportDetail | null>;
  createWithInitialHistory(input: CreateReportRepoInput): Promise<ReportDetail>;
  addSupport(
    reportId: string,
    userId: string
  ): Promise<{ supportCount: number }>;
  addComment(input: {
    reportId: string;
    authorId: string;
    content: string;
  }): Promise<CommentItem>;
  assignManager(
    reportId: string,
    managerId: string
  ): Promise<ReportDetail>;
  transitionStatusAtomic(
    input: TransitionStatusRepoInput
  ): Promise<{ report: ReportDetail; historyEntry: StatusHistoryItem }>;
  listActiveCandidates(): Promise<SimilarReportCandidate[]>;
  listStatRecords(): Promise<ReportStatRecord[]>;
}

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface SessionPort {
  sign(user: SessionUser): Promise<string>;
  verify(token: string): Promise<SessionUser | null>;
}

export interface FileStoragePort {
  saveImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<string>;
  readImage(filename: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  } | null>;
}
