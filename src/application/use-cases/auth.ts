import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import { canManageUserRoles } from "@/domain/report-rules";
import type { Role, SessionUser, UserPublic } from "@/domain/types";
import type { PasswordHasherPort, UserRepository } from "../ports";
import { loginSchema, registerSchema, updateUserRoleSchema } from "../validation";

export async function registerUserUseCase(
  deps: { users: UserRepository; hasher: PasswordHasherPort },
  rawInput: unknown
): Promise<UserPublic> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Données d'inscription invalides."
    );
  }

  const existing = await deps.users.findByEmail(parsed.data.email);
  if (existing) {
    throw new ConflictError(
      "Un compte existe déjà avec cette adresse e-mail."
    );
  }

  const passwordHash = await deps.hasher.hash(parsed.data.password);

  // Règle stricte : l'inscription publique crée toujours un utilisateur standard (USER)
  return deps.users.createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: "USER",
  });
}

export async function loginUserUseCase(
  deps: { users: UserRepository; hasher: PasswordHasherPort },
  rawInput: unknown
): Promise<UserPublic> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Identifiants invalides."
    );
  }

  const found = await deps.users.findByEmail(parsed.data.email);
  if (!found) {
    throw new UnauthorizedError("E-mail ou mot de passe incorrect.");
  }

  const valid = await deps.hasher.verify(
    parsed.data.password,
    found.passwordHash
  );
  if (!valid) {
    throw new UnauthorizedError("E-mail ou mot de passe incorrect.");
  }

  return {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
    createdAt: found.createdAt,
  };
}

export async function listUsersUseCase(
  deps: { users: UserRepository },
  actor: SessionUser | null
): Promise<UserPublic[]> {
  if (!actor) {
    throw new UnauthorizedError();
  }
  if (!canManageUserRoles(actor)) {
    throw new ForbiddenError(
      "Seul un administrateur peut consulter la liste des utilisateurs."
    );
  }
  return deps.users.listAll();
}

export async function listManagersUseCase(
  deps: { users: UserRepository },
  actor: SessionUser | null
): Promise<UserPublic[]> {
  if (!actor) {
    throw new UnauthorizedError();
  }
  if (!canManageUserRoles(actor)) {
    throw new ForbiddenError(
      "Seul un administrateur peut consulter la liste des responsables."
    );
  }
  return deps.users.listManagers();
}

export async function updateUserRoleUseCase(
  deps: { users: UserRepository },
  actor: SessionUser | null,
  targetUserId: string,
  rawInput: unknown
): Promise<UserPublic> {
  if (!actor) {
    throw new UnauthorizedError();
  }
  if (!canManageUserRoles(actor)) {
    throw new ForbiddenError(
      "Seul un administrateur peut modifier le rôle d'un utilisateur."
    );
  }

  const parsed = updateUserRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Rôle invalide."
    );
  }

  if (targetUserId === actor.userId && parsed.data.role !== "ADMIN") {
    throw new ValidationError(
      "Vous ne pouvez pas retirer vos propres droits administrateur."
    );
  }

  const target = await deps.users.findById(targetUserId);
  if (!target) {
    throw new NotFoundError("Utilisateur introuvable.");
  }

  return deps.users.updateRole(targetUserId, parsed.data.role as Role);
}
