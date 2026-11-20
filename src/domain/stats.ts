import {
  CATEGORIES,
  REPORT_STATUSES,
  type Category,
  type DashboardStats,
  type ReportStatus,
} from "./types";

export interface ReportStatRecord {
  status: ReportStatus;
  category: Category;
  createdAt: Date;
  resolvedAt: Date | null;
  supportCount: number;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeDashboardStats(
  records: ReportStatRecord[]
): DashboardStats {
  const byStatus = Object.fromEntries(
    REPORT_STATUSES.map((status) => [status, 0])
  ) as Record<ReportStatus, number>;

  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category, 0])
  ) as Record<Category, number>;

  let activeReports = 0;
  let resolvedReports = 0;
  let totalSupports = 0;
  const resolutionDurationsHours: number[] = [];

  for (const record of records) {
    byStatus[record.status] += 1;
    byCategory[record.category] += 1;
    totalSupports += record.supportCount;

    if (record.status === "RESOLU") {
      resolvedReports += 1;
      if (record.resolvedAt) {
        const diffMs = record.resolvedAt.getTime() - record.createdAt.getTime();
        if (diffMs >= 0) {
          resolutionDurationsHours.push(diffMs / 3_600_000);
        }
      }
    } else {
      activeReports += 1;
    }
  }

  let averageResolutionHours: number | null = null;
  let medianResolutionHours: number | null = null;

  if (resolutionDurationsHours.length > 0) {
    const sum = resolutionDurationsHours.reduce((acc, h) => acc + h, 0);
    averageResolutionHours = roundToOneDecimal(
      sum / resolutionDurationsHours.length
    );

    const sorted = [...resolutionDurationsHours].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    medianResolutionHours = roundToOneDecimal(median);
  }

  return {
    totalReports: records.length,
    activeReports,
    resolvedReports,
    totalSupports,
    byStatus,
    byCategory,
    averageResolutionHours,
    medianResolutionHours,
  };
}
