import { listReportsUseCase } from "@/application/use-cases/reports";
import { ReportCatalog } from "@/components/ReportCatalog";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import { getAppDeps } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialReports = [] as Awaited<ReturnType<typeof listReportsUseCase>>;
  let initialError: string | null = null;

  try {
    const viewer = await getCurrentSessionUser().catch(() => null);
    const { reports } = getAppDeps();
    initialReports = await listReportsUseCase({ reports }, {}, viewer);
  } catch {
    initialError =
      "Base de données PostgreSQL indisponible pour le moment. Vérifiez votre connexion ou lancez Docker Compose.";
  }

  return (
    <ReportCatalog
      initialReports={initialReports}
      initialError={initialError}
    />
  );
}
