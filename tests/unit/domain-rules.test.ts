import { describe, expect, it } from "vitest";
import { ForbiddenError, ValidationError } from "@/domain/errors";
import {
  assertValidStatusTransition,
  canAdvanceReportStatus,
  canTransitionStatus,
} from "@/domain/report-rules";
import { findSimilarActiveReports } from "@/domain/similarity";
import { computeDashboardStats } from "@/domain/stats";
import type { SimilarReportCandidate } from "@/domain/types";

describe("Règles métier — Transitions de statut et permissions", () => {
  it("autorise uniquement la progression stricte nouveau → pris en charge → en cours → résolu", () => {
    expect(canTransitionStatus("NOUVEAU", "PRIS_EN_CHARGE")).toBe(true);
    expect(canTransitionStatus("PRIS_EN_CHARGE", "EN_COURS")).toBe(true);
    expect(canTransitionStatus("EN_COURS", "RESOLU")).toBe(true);

    expect(canTransitionStatus("NOUVEAU", "EN_COURS")).toBe(false);
    expect(canTransitionStatus("NOUVEAU", "RESOLU")).toBe(false);
    expect(canTransitionStatus("EN_COURS", "NOUVEAU")).toBe(false);
    expect(canTransitionStatus("RESOLU", "EN_COURS")).toBe(false);
  });

  it("autorise uniquement le responsable assigné ou l'administrateur", () => {
    expect(
      canAdvanceReportStatus(
        { userId: "mgr-1", role: "MANAGER" },
        { assignedToId: "mgr-1" }
      )
    ).toBe(true);

    expect(
      canAdvanceReportStatus(
        { userId: "mgr-2", role: "MANAGER" },
        { assignedToId: "mgr-1" }
      )
    ).toBe(false);

    expect(
      canAdvanceReportStatus(
        { userId: "user-1", role: "USER" },
        { assignedToId: "user-1" }
      )
    ).toBe(false);

    expect(
      canAdvanceReportStatus(
        { userId: "admin-1", role: "ADMIN" },
        { assignedToId: null }
      )
    ).toBe(true);
  });

  it("refuse la transition pour un responsable non assigné et exige une description à la résolution", () => {
    expect(() =>
      assertValidStatusTransition({
        actor: { userId: "mgr-2", role: "MANAGER" },
        currentStatus: "NOUVEAU",
        targetStatus: "PRIS_EN_CHARGE",
        assignedToId: "mgr-1",
      })
    ).toThrow(ForbiddenError);

    expect(() =>
      assertValidStatusTransition({
        actor: { userId: "mgr-1", role: "MANAGER" },
        currentStatus: "EN_COURS",
        targetStatus: "RESOLU",
        assignedToId: "mgr-1",
        note: "   ",
      })
    ).toThrow(ValidationError);

    expect(() =>
      assertValidStatusTransition({
        actor: { userId: "mgr-1", role: "MANAGER" },
        currentStatus: "EN_COURS",
        targetStatus: "RESOLU",
        assignedToId: "mgr-1",
        note: "OK",
      })
    ).toThrow(ValidationError);

    const res = assertValidStatusTransition({
      actor: { userId: "mgr-1", role: "MANAGER" },
      currentStatus: "EN_COURS",
      targetStatus: "RESOLU",
      assignedToId: "mgr-1",
      note: "Remplacement de la lampe du vidéoprojecteur effectué.",
    });
    expect(res.normalizedNote).toBe(
      "Remplacement de la lampe du vidéoprojecteur effectué."
    );
  });
});

describe("Règles métier — Détection de signalements actifs similaires", () => {
  const candidates: SimilarReportCandidate[] = [
    {
      id: "r1",
      title: "Vidéoprojecteur cassé en salle A102",
      category: "INFORMATIQUE",
      location: "Bâtiment A — Hall et salles",
      status: "EN_COURS",
      supportCount: 4,
      createdAt: new Date("2026-11-18T10:00:00Z"),
    },
    {
      id: "r2",
      title: "Vidéoprojecteur réparé à la bibliothèque",
      category: "INFORMATIQUE",
      location: "Bibliothèque universitaire",
      status: "RESOLU",
      supportCount: 9,
      createdAt: new Date("2026-11-17T10:00:00Z"),
    },
    {
      id: "r3",
      title: "Fuite d'eau au rez-de-chaussée",
      category: "PROPRETE",
      location: "Résidence Nord",
      status: "NOUVEAU",
      supportCount: 1,
      createdAt: new Date("2026-11-19T10:00:00Z"),
    },
  ];

  it("remonte les signalements actifs pertinents et exclut ceux déjà résolus", () => {
    const matches = findSimilarActiveReports(
      {
        title: "Panne sur le vidéoprojecteur A102",
        category: "INFORMATIQUE",
        location: "Bâtiment A — Hall et salles",
      },
      candidates
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe("r1");
    expect(matches[0]?.reasons).toContain("Même catégorie");
    expect(matches[0]?.reasons).toContain("Même lieu");
  });
});

describe("Règles métier — Statistiques et délai de résolution", () => {
  it("retourne null pour les délais lorsqu'aucun signalement n'est résolu", () => {
    const stats = computeDashboardStats([
      {
        status: "NOUVEAU",
        category: "ECLAIRAGE",
        createdAt: new Date("2026-11-19T08:00:00Z"),
        resolvedAt: null,
        supportCount: 2,
      },
    ]);

    expect(stats.totalReports).toBe(1);
    expect(stats.activeReports).toBe(1);
    expect(stats.resolvedReports).toBe(0);
    expect(stats.averageResolutionHours).toBeNull();
    expect(stats.medianResolutionHours).toBeNull();
  });

  it("calcule fidèlement les répartitions et la moyenne/médiane de résolution en heures", () => {
    const stats = computeDashboardStats([
      {
        status: "RESOLU",
        category: "INFORMATIQUE",
        createdAt: new Date("2026-11-19T08:00:00Z"),
        resolvedAt: new Date("2026-11-19T10:00:00Z"), // 2h
        supportCount: 3,
      },
      {
        status: "RESOLU",
        category: "MATERIEL",
        createdAt: new Date("2026-11-19T08:00:00Z"),
        resolvedAt: new Date("2026-11-19T14:00:00Z"), // 6h
        supportCount: 1,
      },
      {
        status: "EN_COURS",
        category: "INFORMATIQUE",
        createdAt: new Date("2026-11-19T12:00:00Z"),
        resolvedAt: null,
        supportCount: 5,
      },
    ]);

    expect(stats.totalReports).toBe(3);
    expect(stats.activeReports).toBe(1);
    expect(stats.resolvedReports).toBe(2);
    expect(stats.totalSupports).toBe(9);
    expect(stats.byStatus.RESOLU).toBe(2);
    expect(stats.byStatus.EN_COURS).toBe(1);
    expect(stats.byCategory.INFORMATIQUE).toBe(2);
    expect(stats.byCategory.MATERIEL).toBe(1);
    expect(stats.averageResolutionHours).toBe(4);
    expect(stats.medianResolutionHours).toBe(4);
  });
});
