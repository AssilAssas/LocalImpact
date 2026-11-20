import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  registerUserUseCase,
  updateUserRoleUseCase,
} from "@/application/use-cases/auth";
import {
  assignReportUseCase,
  createReportUseCase,
  getDashboardStatsUseCase,
  supportReportUseCase,
  transitionReportStatusUseCase,
} from "@/application/use-cases/reports";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/domain/errors";
import { BcryptPasswordHasher } from "@/infrastructure/auth/password";
import { PrismaReportRepository } from "@/infrastructure/repositories/prisma-report-repository";
import { PrismaUserRepository } from "@/infrastructure/repositories/prisma-user-repository";
import { LocalFileStorage } from "@/infrastructure/storage/local-file-storage";

const testDbUrl = process.env.DATABASE_URL_TEST;
const describeWithDb = testDbUrl ? describe : describe.skip;

describeWithDb("Tests d'intégration PostgreSQL (base isolée)", () => {
  let prisma: PrismaClient;
  let usersRepo: PrismaUserRepository;
  let reportsRepo: PrismaReportRepository;
  let hasher: BcryptPasswordHasher;
  let storage: LocalFileStorage;
  let tempUploadDir: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    await prisma.$connect();
    usersRepo = new PrismaUserRepository(prisma);
    reportsRepo = new PrismaReportRepository(prisma);
    hasher = new BcryptPasswordHasher();
    tempUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "localimpact-test-"));
    storage = new LocalFileStorage(tempUploadDir);
  });

  beforeEach(async () => {
    await prisma.statusHistory.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.support.deleteMany();
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (tempUploadDir) {
      await fs.rm(tempUploadDir, { recursive: true, force: true });
    }
  });

  it("valide le cycle complet contre PostgreSQL : concurrence soutien, RBAC, transaction et stats", async () => {
    const adminHash = await hasher.hash("Admin1234!");
    const admin = await usersRepo.createUser({
      name: "Admin Test",
      email: "admin-test@campus.fr",
      passwordHash: adminHash,
      role: "ADMIN",
    });

    const user = await registerUserUseCase(
      { users: usersRepo, hasher },
      {
        name: "Alice Test",
        email: "alice-test@campus.fr",
        password: "User1234!",
      }
    );

    const mgr1 = await registerUserUseCase(
      { users: usersRepo, hasher },
      {
        name: "Manager 1",
        email: "mgr1-test@campus.fr",
        password: "User1234!",
      }
    );
    await updateUserRoleUseCase(
      { users: usersRepo },
      { userId: admin.id, email: admin.email, name: admin.name, role: "ADMIN" },
      mgr1.id,
      { role: "MANAGER" }
    );

    const mgr2 = await registerUserUseCase(
      { users: usersRepo, hasher },
      {
        name: "Manager 2",
        email: "mgr2-test@campus.fr",
        password: "User1234!",
      }
    );
    await updateUserRoleUseCase(
      { users: usersRepo },
      { userId: admin.id, email: admin.email, name: admin.name, role: "ADMIN" },
      mgr2.id,
      { role: "MANAGER" }
    );

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const report = await createReportUseCase(
      { reports: reportsRepo, storage },
      { userId: user.id, email: user.email, name: user.name, role: "USER" },
      {
        title: "Prise électrique arrachée",
        description: "La prise murale du fond de la salle est descellée.",
        category: "MATERIEL",
        location: "Bâtiment A — Hall et salles",
      },
      { buffer: pngBuffer, mimeType: "image/png", size: pngBuffer.length }
    );

    expect(report.photoPath).toMatch(/^\/api\/uploads\/.+\.png$/);

    // Test de concurrence réel sur la contrainte unique PostgreSQL
    const [s1, s2] = await Promise.allSettled([
      supportReportUseCase(
        { reports: reportsRepo },
        { userId: user.id, email: user.email, name: user.name, role: "USER" },
        report.id
      ),
      supportReportUseCase(
        { reports: reportsRepo },
        { userId: user.id, email: user.email, name: user.name, role: "USER" },
        report.id
      ),
    ]);

    const okCount = [s1, s2].filter((r) => r.status === "fulfilled").length;
    const conflictCount = [s1, s2].filter(
      (r) => r.status === "rejected" && r.reason instanceof ConflictError
    ).length;
    expect(okCount).toBe(1);
    expect(conflictCount).toBe(1);

    await assignReportUseCase(
      { reports: reportsRepo, users: usersRepo },
      { userId: admin.id, email: admin.email, name: admin.name, role: "ADMIN" },
      report.id,
      { assignedToId: mgr1.id }
    );

    // Refus pour un responsable non assigné
    await expect(
      transitionReportStatusUseCase(
        { reports: reportsRepo },
        { userId: mgr2.id, email: mgr2.email, name: mgr2.name, role: "MANAGER" },
        report.id,
        { targetStatus: "PRIS_EN_CHARGE" }
      )
    ).rejects.toThrow(ForbiddenError);

    // Progression par le responsable assigné
    await transitionReportStatusUseCase(
      { reports: reportsRepo },
      { userId: mgr1.id, email: mgr1.email, name: mgr1.name, role: "MANAGER" },
      report.id,
      { targetStatus: "PRIS_EN_CHARGE" }
    );
    await transitionReportStatusUseCase(
      { reports: reportsRepo },
      { userId: mgr1.id, email: mgr1.email, name: mgr1.name, role: "MANAGER" },
      report.id,
      { targetStatus: "EN_COURS" }
    );

    await expect(
      transitionReportStatusUseCase(
        { reports: reportsRepo },
        { userId: mgr1.id, email: mgr1.email, name: mgr1.name, role: "MANAGER" },
        report.id,
        { targetStatus: "RESOLU", note: "court" }
      )
    ).rejects.toThrow(ValidationError);

    const resolved = await transitionReportStatusUseCase(
      { reports: reportsRepo },
      { userId: mgr1.id, email: mgr1.email, name: mgr1.name, role: "MANAGER" },
      report.id,
      {
        targetStatus: "RESOLU",
        note: "Boîtier mural remplacé et disjoncteur vérifié.",
      }
    );

    expect(resolved.report.history).toHaveLength(4);
    const stats = await getDashboardStatsUseCase({ reports: reportsRepo });
    expect(stats.resolvedReports).toBe(1);
    expect(stats.totalSupports).toBe(1);
  });
});
