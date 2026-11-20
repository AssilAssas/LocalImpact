export const ROLES = ["USER", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = [
  "MATERIEL",
  "ACCESSIBILITE",
  "ECLAIRAGE",
  "PROPRETE",
  "INFORMATIQUE",
  "AUTRE",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const REPORT_STATUSES = [
  "NOUVEAU",
  "PRIS_EN_CHARGE",
  "EN_COURS",
  "RESOLU",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Utilisateur",
  MANAGER: "Responsable",
  ADMIN: "Administrateur",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  MATERIEL: "Matériel défectueux",
  ACCESSIBILITE: "Accessibilité",
  ECLAIRAGE: "Éclairage",
  PROPRETE: "Propreté",
  INFORMATIQUE: "Équipement informatique",
  AUTRE: "Autre",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  NOUVEAU: "Nouveau",
  PRIS_EN_CHARGE: "Pris en charge",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
};

export const CAMPUS_LOCATIONS = [
  "Bâtiment A — Hall et salles",
  "Bâtiment B — Sciences",
  "Bibliothèque universitaire",
  "Amphithéâtre principal",
  "Résidence Nord",
  "Restaurant universitaire",
  "Parking & parvis",
] as const;

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export interface UserWithSecret extends UserPublic {
  passwordHash: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface ReportSummary {
  id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  photoPath: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  authorId: string;
  authorName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  supportCount: number;
  commentCount: number;
  supportedByViewer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentItem {
  id: string;
  content: string;
  reportId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: Date;
}

export interface StatusHistoryItem {
  id: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  note: string | null;
  changedById: string;
  changedByName: string;
  changedByRole: Role;
  createdAt: Date;
}

export interface ReportDetail extends ReportSummary {
  comments: CommentItem[];
  history: StatusHistoryItem[];
}

export interface SimilarReportCandidate {
  id: string;
  title: string;
  category: Category;
  location: string;
  status: ReportStatus;
  supportCount: number;
  createdAt: Date;
}

export interface SimilarReportMatch extends SimilarReportCandidate {
  score: number;
  reasons: string[];
}

export interface DashboardStats {
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  totalSupports: number;
  byStatus: Record<ReportStatus, number>;
  byCategory: Record<Category, number>;
  averageResolutionHours: number | null;
  medianResolutionHours: number | null;
}
