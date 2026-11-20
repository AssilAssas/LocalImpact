import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { getCurrentSessionUser } from "@/infrastructure/auth/current-user";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LocalImpact — Signalement et suivi campus",
  description:
    "Plateforme de signalement et de suivi des problèmes du quotidien sur le campus.",
  openGraph: {
    title: "LocalImpact — Signalement et suivi campus",
    description:
      "Signalez les incidents du campus, soutenez les demandes existantes et suivez chaque intervention.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentSessionUser().catch(() => null);

  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
        >
          Aller au contenu principal
        </a>

        <Navbar user={user} />

        <main
          id="main-content"
          className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>LocalImpact — Suivi des incidents du campus</span>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-slate-900 transition-colors">
                Signalements
              </a>
              <a
                href="/tableau-de-bord"
                className="hover:text-slate-900 transition-colors"
              >
                Tableau de bord
              </a>
              <a
                href="/signalements/nouveau"
                className="hover:text-slate-900 transition-colors"
              >
                Signaler un problème
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
