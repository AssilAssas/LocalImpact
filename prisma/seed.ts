import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("AdminCampus2026!", 10);
  const managerHash = await bcrypt.hash("RespCampus2026!", 10);
  const userHash = await bcrypt.hash("UserCampus2026!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@campus.fr" },
    update: { name: "Nadia Benali", role: "ADMIN" },
    create: {
      email: "admin@campus.fr",
      name: "Nadia Benali",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const managerInfo = await prisma.user.upsert({
    where: { email: "resp.info@campus.fr" },
    update: { name: "Karim Haddad", role: "MANAGER" },
    create: {
      email: "resp.info@campus.fr",
      name: "Karim Haddad",
      passwordHash: managerHash,
      role: "MANAGER",
    },
  });

  const managerBat = await prisma.user.upsert({
    where: { email: "resp.batiment@campus.fr" },
    update: { name: "Claire Moreau", role: "MANAGER" },
    create: {
      email: "resp.batiment@campus.fr",
      name: "Claire Moreau",
      passwordHash: managerHash,
      role: "MANAGER",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@campus.fr" },
    update: { name: "Alice Martin", role: "USER" },
    create: {
      email: "alice@campus.fr",
      name: "Alice Martin",
      passwordHash: userHash,
      role: "USER",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@campus.fr" },
    update: { name: "Bob Diallo", role: "USER" },
    create: {
      email: "bob@campus.fr",
      name: "Bob Diallo",
      passwordHash: userHash,
      role: "USER",
    },
  });

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  const seededReports = [
    {
      id: "seed-report-projecteur-amphi",
      title: "Vidéoprojecteur HDMI en panne en amphithéâtre",
      description:
        "Le vidéoprojecteur principal clignote en rouge et ne détecte aucun câble HDMI depuis ce matin. Plusieurs cours magistraux sont perturbés.",
      category: "INFORMATIQUE" as const,
      location: "Amphithéâtre principal",
      status: "EN_COURS" as const,
      authorId: alice.id,
      assignedToId: managerInfo.id,
      createdAt: hoursAgo(18),
      resolvedAt: null,
      resolutionNote: null,
    },
    {
      id: "seed-report-eclairage-parking",
      title: "Lampadaire éteint près du passage piéton du parking",
      description:
        "Deux bornes d'éclairage ne s'allument plus à la tombée de la nuit côté entrée nord du parking étudiant.",
      category: "ECLAIRAGE" as const,
      location: "Parking & parvis",
      status: "PRIS_EN_CHARGE" as const,
      authorId: bob.id,
      assignedToId: managerBat.id,
      createdAt: hoursAgo(12),
      resolvedAt: null,
      resolutionNote: null,
    },
    {
      id: "seed-report-rampe-biblio",
      title: "Poignée d'ouverture PMR bloquée à la bibliothèque",
      description:
        "Le bouton d'ouverture automatique de la porte accessible côté est ne déclenche plus le vérin.",
      category: "ACCESSIBILITE" as const,
      location: "Bibliothèque universitaire",
      status: "NOUVEAU" as const,
      authorId: alice.id,
      assignedToId: null,
      createdAt: hoursAgo(4),
      resolvedAt: null,
      resolutionNote: null,
    },
    {
      id: "seed-report-radiateur-bat-a",
      title: "Fuite sur radiateur salle A204",
      description:
        "Un filet d'eau s'écoule sous le robinet thermostatique du radiateur près de la fenêtre nord.",
      category: "MATERIEL" as const,
      location: "Bâtiment A — Hall et salles",
      status: "RESOLU" as const,
      authorId: bob.id,
      assignedToId: managerBat.id,
      createdAt: hoursAgo(48),
      resolvedAt: hoursAgo(42),
      resolutionNote:
        "Joint du robinet thermostatique remplacé et purge du circuit effectuée. Aucune fuite résiduelle constatée.",
    },
    {
      id: "seed-report-tri-ru",
      title: "Bacs de tri débordants à la sortie du restaurant",
      description:
        "Les bacs papier et plastique de la terrasse sont pleins depuis midi et nécessitent un passage de collecte.",
      category: "PROPRETE" as const,
      location: "Restaurant universitaire",
      status: "RESOLU" as const,
      authorId: alice.id,
      assignedToId: managerBat.id,
      createdAt: hoursAgo(30),
      resolvedAt: hoursAgo(26),
      resolutionNote:
        "Collecte effectuée par l'équipe propreté et ajout d'un bac supplémentaire pour le service du midi.",
    },
  ];

  for (const r of seededReports) {
    await prisma.report.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }

  // Historique idempotent
  const existingHistories = await prisma.statusHistory.count({
    where: { reportId: { in: seededReports.map((r) => r.id) } },
  });

  if (existingHistories === 0) {
    await prisma.statusHistory.createMany({
      data: [
        {
          reportId: "seed-report-projecteur-amphi",
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: alice.id,
          createdAt: hoursAgo(18),
        },
        {
          reportId: "seed-report-projecteur-amphi",
          fromStatus: "NOUVEAU",
          toStatus: "PRIS_EN_CHARGE",
          note: "Assigné au pôle audiovisuel pour diagnostic.",
          changedById: admin.id,
          createdAt: hoursAgo(16),
        },
        {
          reportId: "seed-report-projecteur-amphi",
          fromStatus: "PRIS_EN_CHARGE",
          toStatus: "EN_COURS",
          note: "Lampe de rechange commandée, intervention en cours.",
          changedById: managerInfo.id,
          createdAt: hoursAgo(10),
        },
        {
          reportId: "seed-report-eclairage-parking",
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: bob.id,
          createdAt: hoursAgo(12),
        },
        {
          reportId: "seed-report-eclairage-parking",
          fromStatus: "NOUVEAU",
          toStatus: "PRIS_EN_CHARGE",
          note: "Vérification du coffret électrique prévue ce soir.",
          changedById: managerBat.id,
          createdAt: hoursAgo(8),
        },
        {
          reportId: "seed-report-rampe-biblio",
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: alice.id,
          createdAt: hoursAgo(4),
        },
        {
          reportId: "seed-report-radiateur-bat-a",
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: bob.id,
          createdAt: hoursAgo(48),
        },
        {
          reportId: "seed-report-radiateur-bat-a",
          fromStatus: "NOUVEAU",
          toStatus: "PRIS_EN_CHARGE",
          note: "Prise en charge par maintenance bâtiment.",
          changedById: managerBat.id,
          createdAt: hoursAgo(46),
        },
        {
          reportId: "seed-report-radiateur-bat-a",
          fromStatus: "PRIS_EN_CHARGE",
          toStatus: "EN_COURS",
          note: "Fermeture de la vanne et démontage du joint.",
          changedById: managerBat.id,
          createdAt: hoursAgo(44),
        },
        {
          reportId: "seed-report-radiateur-bat-a",
          fromStatus: "EN_COURS",
          toStatus: "RESOLU",
          note: "Joint du robinet thermostatique remplacé et purge du circuit effectuée. Aucune fuite résiduelle constatée.",
          changedById: managerBat.id,
          createdAt: hoursAgo(42),
        },
        {
          reportId: "seed-report-tri-ru",
          fromStatus: null,
          toStatus: "NOUVEAU",
          note: "Signalement créé.",
          changedById: alice.id,
          createdAt: hoursAgo(30),
        },
        {
          reportId: "seed-report-tri-ru",
          fromStatus: "NOUVEAU",
          toStatus: "PRIS_EN_CHARGE",
          note: "Demande transmise au prestataire propreté.",
          changedById: admin.id,
          createdAt: hoursAgo(29),
        },
        {
          reportId: "seed-report-tri-ru",
          fromStatus: "PRIS_EN_CHARGE",
          toStatus: "EN_COURS",
          note: "Équipe sur place.",
          changedById: managerBat.id,
          createdAt: hoursAgo(27),
        },
        {
          reportId: "seed-report-tri-ru",
          fromStatus: "EN_COURS",
          toStatus: "RESOLU",
          note: "Collecte effectuée par l'équipe propreté et ajout d'un bac supplémentaire pour le service du midi.",
          changedById: managerBat.id,
          createdAt: hoursAgo(26),
        },
      ],
    });
  }

  // Soutiens idempotents
  const supports = [
    { reportId: "seed-report-projecteur-amphi", userId: alice.id },
    { reportId: "seed-report-projecteur-amphi", userId: bob.id },
    { reportId: "seed-report-eclairage-parking", userId: bob.id },
    { reportId: "seed-report-eclairage-parking", userId: alice.id },
    { reportId: "seed-report-rampe-biblio", userId: alice.id },
  ];

  for (const s of supports) {
    await prisma.support.upsert({
      where: {
        reportId_userId: {
          reportId: s.reportId,
          userId: s.userId,
        },
      },
      update: {},
      create: s,
    });
  }

  // Commentaires idempotents
  const existingComments = await prisma.comment.count({
    where: { reportId: { in: seededReports.map((r) => r.id) } },
  });
  if (existingComments === 0) {
    await prisma.comment.createMany({
      data: [
        {
          reportId: "seed-report-projecteur-amphi",
          authorId: bob.id,
          content: "Confirmé également en cours de 14h, le boîtier mural clignote.",
          createdAt: hoursAgo(15),
        },
        {
          reportId: "seed-report-projecteur-amphi",
          authorId: managerInfo.id,
          content:
            "Nous avons installé un projecteur mobile temporaire en attendant la pièce.",
          createdAt: hoursAgo(9),
        },
      ],
    });
  }

  console.log("Seed LocalImpact terminé avec succès.");
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
