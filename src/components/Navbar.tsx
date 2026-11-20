"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { ROLE_LABELS, type SessionUser } from "@/domain/types";

export function Navbar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navLinks = [
    { href: "/", label: "Signalements" },
    { href: "/tableau-de-bord", label: "Tableau de bord" },
    ...(user && (user.role === "MANAGER" || user.role === "ADMIN")
      ? [{ href: "/responsable", label: "Interventions" }]
      : []),
    ...(user && user.role === "ADMIN"
      ? [{ href: "/admin/utilisateurs", label: "Utilisateurs" }]
      : []),
    ...(!user ? [{ href: "/connexion", label: "Connexion" }] : []),
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMobileOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
        >
          LocalImpact
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-sm ${
                  active
                    ? "border-teal-700 text-slate-900 font-semibold"
                    : "border-transparent hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="whitespace-nowrap shrink-0 py-1 text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-sm disabled:opacity-60"
            >
              {loggingOut ? "Déconnexion..." : `Quitter (${user.name.split(" ")[0]})`}
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/signalements/nouveau"
            className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700"
          >
            Signaler un problème
          </Link>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {user && (
            <div className="pb-2 mb-2 border-b border-slate-100 text-xs text-slate-600">
              Connecté en tant que{" "}
              <span className="font-semibold text-slate-900">{user.name}</span>{" "}
              · {ROLE_LABELS[user.role]}
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/signalements/nouveau"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-white bg-teal-700 hover:bg-teal-800"
          >
            Signaler un problème
          </Link>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              {loggingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
