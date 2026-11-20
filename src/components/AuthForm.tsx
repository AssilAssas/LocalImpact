"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema, registerSchema } from "@/application/validation";

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
}

export function AuthForm({ mode, redirectTo = "/" }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = isRegister
      ? registerSchema.safeParse({ name, email, password })
      : loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Une erreur est survenue.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {isRegister ? "Créer un compte" : "Se connecter"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {isRegister
            ? "L'inscription crée un compte utilisateur pour signaler, soutenir et commenter les incidents du campus."
            : "Accédez à votre espace LocalImpact pour suivre ou signaler un problème."}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {isRegister && (
          <div>
            <label
              htmlFor="auth-name"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Nom complet
            </label>
            <input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Martin"
              className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Adresse e-mail
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@campus.fr"
            className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Mot de passe
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "Minimum 8 caractères" : "Votre mot de passe"}
            className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700 disabled:opacity-60"
        >
          {submitting
            ? "Validation en cours..."
            : isRegister
              ? "Créer mon compte"
              : "Connexion"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-600 text-center">
        {isRegister ? (
          <>
            Déjà inscrit ?{" "}
            <Link
              href="/connexion"
              className="font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-4"
            >
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link
              href="/inscription"
              className="font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-4"
            >
              Créer un compte
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
