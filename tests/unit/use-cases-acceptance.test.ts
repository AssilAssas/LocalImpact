import { beforeEach, describe, expect, it } from "vitest";
import {
  registerUserUseCase,
  updateUserRoleUseCase,
} from "@/application/use-cases/auth";
import {
  addCommentUseCase,
  assignReportUseCase,
  createReportUseCase,
  findSimilarReportsUseCase,
  getDashboardStatsUseCase,
  supportReportUseCase,
  transitionReportStatusUseCase,
} from "@/application/use-cases/reports";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import type { SessionUser } from "@/domain/types";
import {
  FakePasswordHasher,
  InMemoryFileStorage,
  InMemoryReportRepository,
  InMemoryUserRepository,
} from "../helpers/in-memory-repos";

describe("Tests d'acceptation — Cas d'usage LocalImpact", () => {
  let usersRepo: InMemoryUserRepository;
  let reportsRepo: InMemoryReportRepository;
  let hasher: FakePasswordHasher;
  let storage: InMemoryFileStorage;
  let adminSession: SessionUser;
  let managerSession: SessionUser;
  let otherManagerSession: SessionUser;
  let userSession: SessionUser;

  beforeEach(async () => {
    usersRepo = new InMemoryUserRepository();
    reportsRepo = new InMemoryReportRepository(usersRepo);
    hasher = new FakePasswordHasher();
    storage = new InMemoryFileStorage();

    const admin = await usersRepo.createUser({
      name: "Admin Campus",
      email: "admin@campus.fr",
      passwordHash: "hashed:AdminPass123",
      role: "ADMIN",
    });
    const mgr1 = await usersRepo.createUser({
      name: "Responsable 1",
      email: "resp1@campus.fr",
      passwordHash: "hashed:MgrPass123",
      role: "MANAGER",
    });
    const mgr2 = await usersRepo.createUser({
      name: "Responsable 2",
      email: "resp2@campus.fr",
      passwordHash: "hashed:MgrPass123",
      role: "MANAGER",
    });
    const alice = await registerUserUseCase(
      { users: usersRepo, hasher },
      {
        name: "Alice",
        email: "alice@campus.fr",
        password: "UserPass123",
        role: "ADMIN", // tentative d'injection de rôle
      }
    );

    adminSession = {
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    managerSession = {
      userId: mgr1.id,
      email: mgr1.email,
      name: mgr1.name,
      role: mgr1.role,
    };
    otherManagerSession = {
      userId: mgr2.id,
      email: mgr2.email,
      name: mgr2.name,
      role: mgr2.role,
    };
    userSession = {
      userId: alice.id,
      email: alice.email,
      name: alice.name,
      role: alice.role,
    };
  });

  it("force le rôle USER à l'inscription publique et réserve la promotion à l'ADMIN", async () => {
    expect(userSession.role).toBe("USER");

    await expect(
      updateUserRoleUseCase(
        { users: usersRepo },
        userSession,
        userSession.userId,
        { role: "ADMIN" }
      )
    ).rejects.toThrow(ForbiddenError);

    const promoted = await updateUserRoleUseCase(
      { users: usersRepo },
      adminSession,
      userSession.userId,
      { role: "MANAGER" }
    );
    expect(promoted.role).toBe("MANAGER");
  });

  it("crée un signalement avec et sans photo, et rejette les fichiers non autorisés", async () => {
    const withoutPhoto = await createReportUseCase(
      { reports: reportsRepo, storage },
      userSession,
      {
        title: "Chaise cassée en salle B201",
        description: "Un pied de chaise est tordu et instable au 2e rang.",
        category: "MATERIEL",
        location: "Bâtiment B — Sciences",
      },
      null
    );
    expect(withoutPhoto.photoPath).toBeNull();
    expect(withoutPhoto.status).toBe("NOUVEAU");
    expect(withoutPhoto.history).toHaveLength(1);

    const fakePng = Buffer.from("png-bytes");
    const withPhoto = await createReportUseCase(
      { reports: reportsRepo, storage },
      userSession,
      {
        title: "Lampadaire éteint parvis",
        description: "Éclairage défaillant devant l'entrée principale.",
        category: "ECLAIRAGE",
        location: "Parking & parvis",
      },
      { buffer: fakePng, mimeType: "image/png", size: fakePng.length }
    );
    expect(withPhoto.photoPath).toMatch(/^\/api\/uploads\/.+\.png$/);
    expect(storage.files.size).toBe(1);

    await expect(
      createReportUseCase(
        { reports: reportsRepo, storage },
        userSession,
        {
          title: "Fichier invalide test",
          description: "Tentative d'upload de script exécutable.",
          category: "AUTRE",
          location: "Bâtiment A — Hall et salles",
        },
        {
          buffer: Buffer.from("bad"),
          mimeType: "application/x-msdownload",
          size: 3,
        }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("garantit le soutien unique même lors de deux appels simultanés", async () => {
    const report = await createReportUseCase(
      { reports: reportsRepo, storage },
      userSession,
      {
        title: "Porte d'accès bloquée",
        description: "Le lecteur de badge ne réagit plus à l'entrée ouest.",
        category: "ACCESSIBILITE",
        location: "Bibliothèque universitaire",
      }
    );

    const outcomes = await Promise.allSettled([
      supportReportUseCase({ reports: reportsRepo }, userSession, report.id),
      supportReportUseCase({ reports: reportsRepo }, userSession, report.id),
    ]);

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictError
    );
  });

  it("protège l'attribution, le changement de statut, la description de résolution et trace l'historique", async () => {
    const report = await createReportUseCase(
      { reports: reportsRepo, storage },
      userSession,
      {
        title: "Switch réseau hors service",
        description: "Aucune prise RJ45 fonctionnelle en salle informatique.",
        category: "INFORMATIQUE",
        location: "Bâtiment B — Sciences",
      }
    );

    // Un utilisateur ou responsable ne peut pas attribuer
    await expect(
      assignReportUseCase(
        { reports: reportsRepo, users: usersRepo },
        managerSession,
        report.id,
        { assignedToId: managerSession.userId }
      )
    ).rejects.toThrow(ForbiddenError);

    // Un administrateur attribue au responsable 1
    await assignReportUseCase(
      { reports: reportsRepo, users: usersRepo },
      adminSession,
      report.id,
      { assignedToId: managerSession.userId }
    );

    // Un autre responsable non assigné et un USER sont refusés (403)
    await expect(
      transitionReportStatusUseCase(
        { reports: reportsRepo },
        otherManagerSession,
        report.id,
        { targetStatus: "PRIS_EN_CHARGE" }
      )
    ).rejects.toThrow(ForbiddenError);

    await expect(
      transitionReportStatusUseCase(
        { reports: reportsRepo },
        userSession,
        report.id,
        { targetStatus: "PRIS_EN_CHARGE" }
      )
    ).rejects.toThrow(ForbiddenError);

    // Le responsable assigné avance étape par étape
    await transitionReportStatusUseCase(
      { reports: reportsRepo },
      managerSession,
      report.id,
      { targetStatus: "PRIS_EN_CHARGE", note: "Ticket pris en charge." }
    );

    await transitionReportStatusUseCase(
      { reports: reportsRepo },
      managerSession,
      report.id,
      { targetStatus: "EN_COURS", note: "Remplacement du module en cours." }
    );

    // Résolution sans description refusée
    await expect(
      transitionReportStatusUseCase(
        { reports: reportsRepo },
        managerSession,
        report.id,
        { targetStatus: "RESOLU", note: "" }
      )
    ).rejects.toThrow(ValidationError);

    // Résolution valide avec description
    const resolved = await transitionReportStatusUseCase(
      { reports: reportsRepo },
      managerSession,
      report.id,
      {
        targetStatus: "RESOLU",
        note: "Switch remplacé et ports testés avec succès.",
      }
    );

    expect(resolved.report.status).toBe("RESOLU");
    expect(resolved.report.resolutionNote).toBe(
      "Switch remplacé et ports testés avec succès."
    );
    expect(resolved.report.history).toHaveLength(4);
    expect(resolved.report.history.map((h) => h.toStatus)).toEqual([
      "NOUVEAU",
      "PRIS_EN_CHARGE",
      "EN_COURS",
      "RESOLU",
    ]);

    const stats = await getDashboardStatsUseCase({ reports: reportsRepo });
    expect(stats.totalReports).toBe(1);
    expect(stats.resolvedReports).toBe(1);
    expect(stats.averageResolutionHours).not.toBeNull();
  });

  it("gère les commentaires et la recherche de doublons actifs", async () => {
    await expect(
      addCommentUseCase({ reports: reportsRepo }, null, "missing", {
        content: "Test",
      })
    ).rejects.toThrow(UnauthorizedError);

    const created = await createReportUseCase(
      { reports: reportsRepo, storage },
      userSession,
      {
        title: "Imprimante bloquée bibliothèque",
        description: "Bourrage papier récurrent sur l'imprimante du 1er étage.",
        category: "INFORMATIQUE",
        location: "Bibliothèque universitaire",
      }
    );

    const comment = await addCommentUseCase(
      { reports: reportsRepo },
      userSession,
      created.id,
      { content: "Le voyant orange clignote depuis 10h." }
    );
    expect(comment.content).toContain("voyant orange");

    const similar = await findSimilarReportsUseCase(
      { reports: reportsRepo },
      {
        title: "Imprimante en panne",
        category: "INFORMATIQUE",
        location: "Bibliothèque universitaire",
      }
    );
    expect(similar).toHaveLength(1);
    expect(similar[0]?.id).toBe(created.id);
  });
});
