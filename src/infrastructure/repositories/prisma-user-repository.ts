import { PrismaClient } from "@prisma/client";
import type { UserRepository } from "@/application/ports";
import type { Role, UserPublic, UserWithSecret } from "@/domain/types";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const user = await this.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as Role,
      createdAt: user.createdAt,
    };
  }

  async findById(id: string): Promise<UserPublic | null> {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      role: user.role as Role,
    };
  }

  async listAll(): Promise<UserPublic[]> {
    const users = await this.db.user.findMany({
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return users.map((u) => ({ ...u, role: u.role as Role }));
  }

  async listManagers(): Promise<UserPublic[]> {
    const users = await this.db.user.findMany({
      where: { role: "MANAGER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return users.map((u) => ({ ...u, role: u.role as Role }));
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserPublic> {
    const created = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return {
      ...created,
      role: created.role as Role,
    };
  }

  async updateRole(userId: string, role: Role): Promise<UserPublic> {
    const updated = await this.db.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return {
      ...updated,
      role: updated.role as Role,
    };
  }
}
