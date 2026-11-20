import Link from "next/link";
import { notFound } from "next/navigation";
import { listManagersUseCase } from "@/application/use-cases/auth";
import { getReportDetailUseCase } from "@/application/use-cases/reports";
import { ReportDetailClient } from "@/components/ReportDetailClient";
import { NotFoundError } from "@/domain/errors";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const viewer = await getCurrentSessionUser().catch(() => null);
    const { reports, users } = getAppDeps();
    const report = await getReportDetailUseCase({ reports }, id, viewer);
    const managers =
      viewer?.role === "ADMIN"
        ? await listManagersUseCase({ users }, viewer)
        : [];

    return (
      <ReportDetailClient
        initialReport={report}
        viewer={viewer}
        managers={managers}
      />
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    return (
      <div className="max-w-xl mx-auto bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-3">
        <h1 className="font-display text-lg font-semibold text-rose-900">
          Impossible de charger le signalement
        </h1>
        <p className="text-sm text-rose-800">
          Vérifiez que la base de données PostgreSQL est démarrée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center min-h-[38px] px-4 py-1.5 text-xs font-semibold text-rose-900 bg-white border border-rose-300 rounded-lg"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }
}
