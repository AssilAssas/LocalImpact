import Link from "next/link";
import { NewReportForm } from "@/components/NewReportForm";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const user = await getCurrentSessionUser().catch(() => null);

  if (!user) {
    return (
      <section className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Connexion requise
        </h1>
        <p className="text-sm text-slate-600">
          Vous devez être connecté pour publier un nouveau signalement sur le
          campus.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/connexion?next=/signalements/nouveau"
            className="inline-flex items-center justify-center min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center min-h-[42px] px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    );
  }

  return <NewReportForm />;
}
