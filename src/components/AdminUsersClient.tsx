"use client";

import { useState } from "react";
import { ROLES, ROLE_LABELS, type Role, type UserPublic } from "@/domain/types";

interface AdminUsersClientProps {
  initialUsers: UserPublic[];
  currentAdminId: string;
}

export function AdminUsersClient({
  initialUsers,
  currentAdminId,
}: AdminUsersClientProps) {
  const [users, setUsers] = useState<UserPublic[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: Role) {
    setSavingId(userId);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const payload = (await response.json()) as {
        user?: UserPublic;
        error?: string;
      };
      if (!response.ok || !payload.user) {
        setError(payload.error ?? "Impossible de modifier le rôle.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? payload.user! : u))
      );
      setFeedback(
        `Rôle de ${payload.user.name} mis à jour : ${ROLE_LABELS[payload.user.role]}.`
      );
    } catch {
      setError("Erreur réseau lors de la mise à jour du rôle.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800"
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Nom</th>
              <th className="py-3 px-4">E-mail</th>
              <th className="py-3 px-4">Rôle actuel</th>
              <th className="py-3 px-4 text-right">Attribuer un rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {users.map((u) => {
              const isSelf = u.id === currentAdminId;
              return (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-500">
                        (vous)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium">
                    {ROLE_LABELS[u.role]}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <label htmlFor={`role-${u.id}`} className="sr-only">
                      Rôle de {u.name}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      value={u.role}
                      disabled={savingId === u.id || isSelf}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as Role)
                      }
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
