import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const OUTPUT_DIR = path.resolve(process.cwd(), "docs");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "LocalImpact_Plan_Projet.pdf");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 48, bottom: 52, left: 48, right: 48 },
  bufferPages: true,
  info: {
    Title: "LocalImpact — Plan d'architecture et de réalisation",
    Author: "Équipe LocalImpact",
    Subject: "Cahier des charges, Clean Architecture, Jalons, Docker et Tests",
  },
});

const stream = fs.createWriteStream(OUTPUT_PATH);
doc.pipe(stream);

doc.registerFont("Sans", FONT_REGULAR);
doc.registerFont("SansBold", FONT_BOLD);
doc.registerFont("Mono", FONT_MONO);

const COLORS = {
  ink: "#0F172A",
  muted: "#475569",
  line: "#CBD5E1",
  surface: "#F8FAFC",
  accent: "#0F766E",
  accentSoft: "#CCFBF1",
};

const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

function ensureSpace(minHeight = 90) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minHeight > bottomLimit) {
    doc.addPage();
  }
}

function addSectionTitle(title) {
  ensureSpace(64);
  doc.moveDown(0.7);
  doc.font("SansBold").fontSize(13.5).fillColor(COLORS.accent).text(title);
  const y = doc.y + 3;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + pageWidth, y)
    .lineWidth(1)
    .strokeColor(COLORS.line)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(COLORS.ink).font("Sans").fontSize(9.5);
}

function addSubTitle(title) {
  ensureSpace(44);
  doc.moveDown(0.35);
  doc.font("SansBold").fontSize(10.5).fillColor(COLORS.ink).text(title);
  doc.moveDown(0.2);
  doc.font("Sans").fontSize(9.5).fillColor(COLORS.ink);
}

function addParagraph(text) {
  doc.font("Sans").fontSize(9.5).fillColor(COLORS.ink).text(text, {
    lineGap: 3,
  });
  doc.moveDown(0.3);
}

function addBullet(lead, body) {
  ensureSpace(26);
  doc
    .font("SansBold")
    .fontSize(9.2)
    .fillColor(COLORS.ink)
    .text(`• ${lead} : `, { continued: true, indent: 6 });
  doc.font("Sans").fontSize(9.2).fillColor(COLORS.ink).text(body, { lineGap: 2.5 });
  doc.moveDown(0.15);
}

function addCodeBlock(lines) {
  const text = lines.join("\n");
  doc.font("Mono").fontSize(8.2);
  const textHeight = doc.heightOfString(text, { width: pageWidth - 20, lineGap: 2 });
  ensureSpace(textHeight + 24);
  const startY = doc.y;
  doc
    .rect(doc.page.margins.left, startY, pageWidth, textHeight + 16)
    .fillAndStroke(COLORS.surface, COLORS.line);
  doc
    .fillColor(COLORS.ink)
    .text(text, doc.page.margins.left + 10, startY + 8, {
      width: pageWidth - 20,
      lineGap: 2,
    });
  doc.y = startY + textHeight + 22;
  doc.font("Sans").fontSize(9.5);
}

function addTable(headers, rows, colWidths) {
  const paddingX = 6;
  const paddingY = 5;

  function drawHeader() {
    doc.font("SansBold").fontSize(8.5);
    let maxH = 0;
    headers.forEach((h, i) => {
      const hgt = doc.heightOfString(h, { width: colWidths[i] - paddingX * 2 });
      if (hgt > maxH) maxH = hgt;
    });
    const rowH = maxH + paddingY * 2;
    ensureSpace(rowH + 30);
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.rect(x, y, pageWidth, rowH).fill("#E2E8F0");
    headers.forEach((h, i) => {
      doc.fillColor(COLORS.ink).text(h, x + paddingX, y + paddingY, {
        width: colWidths[i] - paddingX * 2,
      });
      x += colWidths[i];
    });
    doc
      .rect(doc.page.margins.left, y, pageWidth, rowH)
      .lineWidth(0.6)
      .strokeColor(COLORS.line)
      .stroke();
    doc.y = y + rowH;
  }

  drawHeader();

  rows.forEach((row, rIdx) => {
    doc.font("Sans").fontSize(8.2);
    let maxH = 0;
    row.forEach((cell, i) => {
      const hgt = doc.heightOfString(cell, { width: colWidths[i] - paddingX * 2, lineGap: 1.5 });
      if (hgt > maxH) maxH = hgt;
    });
    const rowH = maxH + paddingY * 2;

    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    const y = doc.y;
    let x = doc.page.margins.left;
    if (rIdx % 2 === 1) {
      doc.rect(x, y, pageWidth, rowH).fill(COLORS.surface);
    }

    row.forEach((cell, i) => {
      doc
        .font(i === 0 ? "SansBold" : "Sans")
        .fontSize(8.2)
        .fillColor(COLORS.ink)
        .text(cell, x + paddingX, y + paddingY, {
          width: colWidths[i] - paddingX * 2,
          lineGap: 1.5,
        });
      x += colWidths[i];
    });

    doc
      .rect(doc.page.margins.left, y, pageWidth, rowH)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();

    let sepX = doc.page.margins.left;
    for (let i = 0; i < colWidths.length - 1; i++) {
      sepX += colWidths[i];
      doc
        .moveTo(sepX, y)
        .lineTo(sepX, y + rowH)
        .lineWidth(0.5)
        .strokeColor(COLORS.line)
        .stroke();
    }
    doc.y = y + rowH;
  });

  doc.moveDown(0.5);
}

// --- COUVERTURE / EN-TÊTE ---
doc
  .rect(doc.page.margins.left, doc.y, pageWidth, 68)
  .fill(COLORS.ink);
doc
  .font("SansBold")
  .fontSize(20)
  .fillColor("#FFFFFF")
  .text("LocalImpact — Plan d'architecture et de réalisation", doc.page.margins.left + 16, doc.y + 14);
doc
  .font("Sans")
  .fontSize(10)
  .fillColor("#CBD5E1")
  .text(
    "Plateforme campus de signalement et de suivi des problèmes du quotidien · Next.js App Router, PostgreSQL, Prisma, Zod & Docker",
    doc.page.margins.left + 16,
    doc.y + 4,
    { width: pageWidth - 32 }
  );
doc.y += 26;
doc.fillColor(COLORS.ink);

addSectionTitle("0. Constat initial du dépôt et environnement");
addBullet(
  "Dépôt de départ",
  "Squelette initial Vite + React 19 + Express (aucun code métier, aucune migration Prisma, aucun test). Le projet est initialisé sur Next.js 15 App Router (port 3000) avec TypeScript strict, Tailwind CSS v4, PostgreSQL, Prisma et Zod."
);
addBullet(
  "Environnement d'exécution",
  "Node.js v22.23.2 et npm 10.9.8 disponibles pour le typage, le build et les tests unitaires Vitest. Docker et PostgreSQL sont orchestrés via Dockerfile multi-stage et compose.yaml pour l'exécution locale complète."
);

addSectionTitle("1. Matrice exigences → écran, règle serveur et test d'acceptation");
addTable(
  ["Exigence (PDF)", "Écran / UI", "Règle serveur", "Test d'acceptation"],
  [
    [
      "Inscription & connexion (3 rôles)",
      "/inscription, /connexion, /admin/utilisateurs",
      "Inscription publique force role = USER. Hachage bcryptjs, session cookie HttpOnly signé (jose). Seul ADMIN change les rôles.",
      "Un POST /api/auth/register avec role: ADMIN crée un USER. USER reçoit 403 sur le changement de rôle ; ADMIN promeut en MANAGER.",
    ],
    [
      "Création signalement + photo facultative",
      "/signalements/nouveau",
      "Session requise (401). Validation Zod (titre, description, catégorie, lieu, image jpeg/png/webp ≤ 5 Mo). Stockage sur volume persistant.",
      "Création réussie avec et sans photo (image servie via /api/uploads/[file]). Rejet 400 si champs invalides ou format/poids interdit.",
    ],
    [
      "Consultation, recherche et filtrage",
      "/ et /signalements/[id]",
      "Requête paramétrée Prisma filtrant category, location, status et mot-clé (insensible à la casse). États chargement, vide et erreur.",
      "Filtres combinés (catégorie + lieu + statut + recherche) retournent exactement les fiches ciblées ; état vide affiché si 0 résultat.",
    ],
    [
      "Soutien unique anti-doublon",
      "Bouton « Soutenir » sur /signalements/[id] et modale doublons",
      "Session requise. Contrainte SQL @@unique([reportId, userId]) sur Support + gestion conflit P2002 → 409 Conflict.",
      "Deux POST /api/reports/[id]/support simultanés (Promise.all) par le même utilisateur → 1 succès 201 et 1 refus 409, compteur +1.",
    ],
    [
      "Attribution à un responsable",
      "Panneau d'assignation sur /signalements/[id] (ADMIN)",
      "Seul ADMIN (403 sinon) attribue le signalement à un utilisateur existant au rôle MANAGER (400 sinon).",
      "USER et MANAGER reçoivent 403 à l'attribution ; ADMIN assigne un MANAGER et l'assignation persiste.",
    ],
    [
      "Suivi des statuts & contrôle d'accès",
      "Contrôle étape sur /signalements/[id] + /responsable",
      "Seul le MANAGER assigné (assignedToId === userId) ou ADMIN avance le statut (403 sinon). Ordre strict NOUVEAU → PRIS_EN_CHARGE → EN_COURS → RESOLU.",
      "Responsable assigné et admin avancent pas à pas ; autre responsable non assigné et USER → 403 ; saut NOUVEAU → RESOLU → 400.",
    ],
    [
      "Résolution obligatoire & historique atomique",
      "Champ intervention obligatoire + frise historique sur /signalements/[id]",
      "Passage à RESOLU exige resolutionNote (min 10 car.). Mise à jour Report + insertion StatusHistory dans une seule prisma.$transaction.",
      "Résolution sans description → 400 (statut inchangé). Résolution valide met à jour statut, resolvedAt et historique atomiquement.",
    ],
    [
      "Commentaires",
      "Fil de commentaires sur /signalements/[id]",
      "Session requise, validation Zod (1–1000 car.), auteur issu de la session serveur.",
      "Utilisateur connecté ajoute un commentaire persisté après rechargement ; visiteur anonyme → 401.",
    ],
    [
      "Tableau de bord statistiques",
      "/tableau-de-bord",
      "Agrégations PostgreSQL par statut et catégorie. Délai = moyenne (resolvedAt - createdAt) en heures sur RESOLU. Si 0 résolu → null.",
      "Totaux fidèles à la base ; 0 résolu → délai null ; 2 signalements résolus en 2 h et 6 h → moyenne 4,0 h.",
    ],
    [
      "Originalité : détection de doublons actifs",
      "Panneau dynamique dans /signalements/nouveau",
      "GET /api/reports/similar sur status != RESOLU. Score pur : catégorie (+3), lieu (+3), mots titre ≥ 3 car. (+2/mot).",
      "Un signalement actif similaire remonte lors de la saisie et peut être soutenu en 1 clic au lieu de créer un doublon.",
    ],
  ],
  [105, 95, 150, 149]
);

addSectionTitle("2. Parcours des trois rôles, permissions et transitions");
addBullet(
  "Utilisateur standard (USER)",
  "S'inscrit/se connecte, consulte et filtre les signalements, vérifie les doublons avant création, crée un signalement avec ou sans photo, soutient une fois, commente et suit la résolution."
);
addBullet(
  "Responsable (MANAGER)",
  "Mêmes capacités de consultation/soutien/commentaire, plus l'espace /responsable regroupant ses signalements assignés dont il peut faire avancer le statut jusqu'à RESOLU."
);
addBullet(
  "Administrateur (ADMIN)",
  "Gère les rôles des comptes (/admin/utilisateurs), attribue les signalements aux responsables et peut faire avancer n'importe quel signalement."
);

addTable(
  ["Opération protégée", "Anonyme", "USER", "MANAGER (non assigné)", "MANAGER (assigné)", "ADMIN"],
  [
    ["Consulter signalements & tableau de bord", "Oui", "Oui", "Oui", "Oui", "Oui"],
    ["Créer un signalement / Soutenir / Commenter", "Non (401)", "Oui", "Oui", "Oui", "Oui"],
    ["Avancer le statut (étapes suivantes)", "Non (401)", "Non (403)", "Non (403)", "Oui", "Oui"],
    ["Attribuer un signalement à un responsable", "Non (401)", "Non (403)", "Non (403)", "Non (403)", "Oui"],
    ["Modifier le rôle d'un utilisateur", "Non (401)", "Non (403)", "Non (403)", "Non (403)", "Oui"],
  ],
  [164, 62, 55, 76, 76, 66]
);

addCodeBlock([
  "Transitions de statut autorisées (machine à états stricte dans src/domain/report-rules.ts) :",
  "  [NOUVEAU] ──▶ [PRIS_EN_CHARGE] ──▶ [EN_COURS] ──(resolutionNote obligatoire)──▶ [RESOLU]",
  "  • Aucun retour en arrière ni saut d'étape. RESOLU est terminal.",
  "  • Chaque transition écrit Report.status + StatusHistory dans une seule transaction SQL.",
]);

addSectionTitle("3. Modèle de données, session, routes et Clean Architecture");
addSubTitle("Entités Prisma & contraintes clés (PostgreSQL)");
addBullet("User", "id, email (@unique), name, passwordHash, role (USER | MANAGER | ADMIN), createdAt.");
addBullet(
  "Report",
  "id, title, description, category, location, photoPath?, status, resolutionNote?, resolvedAt?, authorId, assignedToId?, createdAt, updatedAt. Index sur (status, category), location, assignedToId."
);
addBullet("Support", "id, reportId, userId, createdAt avec contrainte @@unique([reportId, userId]).");
addBullet("Comment & StatusHistory", "liés à Report et User (fromStatus, toStatus, note?, changedById, createdAt).");

addSubTitle("Choix de session justifié");
addParagraph(
  "Session par cookie HttpOnly signé via JWT HS256 (bibliothèque jose) + mots de passe hachés avec bcryptjs. Ce choix est compatible nativement avec Next.js 15 App Router (Server Components, Route Handlers, Middleware), fonctionne 100 % hors-ligne en Docker sans dépendance OAuth cloud ni Redis, et reste isolé derrière l'interface SessionPort."
);

addSubTitle("Arborescence Clean Architecture");
addCodeBlock([
  "src/",
  "├── domain/            # Règles métier pures (0 dépendance Next/Prisma) : statuts, RBAC, similarité, stats",
  "├── application/       # Cas d'usage, ports (repositories, session, stockage, transaction), schémas Zod",
  "├── infrastructure/    # Adaptateurs Prisma, JoseSessionAdapter, LocalFileStorage",
  "├── components/        # Composants UI réutilisables (filtres, formulaires, badges, états vide/erreur)",
  "└── app/               # Pages App Router + Route Handlers minces (/api/auth/*, /api/reports/*, /api/stats, /api/admin/*, /api/uploads/*, /api/health)",
  "prisma/                # schema.prisma, migrations/, seed.ts",
  "tests/                 # unit/ (Vitest), integration/ (PostgreSQL isolé), e2e/ (Playwright)",
]);

addSectionTitle("4. Les cinq jalons du projet");
addTable(
  ["Jalon", "Tâches & livrables", "Dépendance", "Critères de fin", "Répartition équipe"],
  [
    [
      "1. Cadrage & socle",
      "Bascule Next.js App Router (port 3000), TypeScript, Vitest, Clean Architecture, Dockerfile, compose.yaml, .env.example.",
      "Aucune",
      "Build & tsc verts ; tests domaine initiaux verts.",
      "Infra/Back : Next + Docker ; Front : layout ; Domaine : règles pures.",
    ],
    [
      "2. Conception & données",
      "schema.prisma, migration SQL, seed.ts (3 rôles), adaptateurs Prisma/Session/Upload, UI accessible et états complets.",
      "Jalon 1",
      "Migrations + seed idempotent ; tests unitaires complets.",
      "Back : Prisma + adaptateurs ; Front : design system & maquettes.",
    ],
    [
      "3. Première version",
      "Auth complète, création signalement (+ photo + détection doublons), recherche/filtres, détail, soutien unique atomique, commentaires.",
      "Jalon 2",
      "Parcours principal persisté + tests d'intégration (dont concurrence soutien).",
      "Back : API auth/reports/support ; Front : formulaires & filtres.",
    ],
    [
      "4. Version complète",
      "Gestion rôles admin, attribution, workflow statuts + note résolution obligatoire + historique transactionnel, /responsable, /tableau-de-bord.",
      "Jalon 3",
      "Tous les critères du PDF couverts par tests unitaires, intégration & E2E.",
      "Back : RBAC, transactions, stats ; Front : vues admin/resp/dashboard.",
    ],
    [
      "5. Livraison",
      "Recette E2E sous docker compose up --build, test persistance BDD+photos après restart, README complet, préparation soutenance.",
      "Jalon 4",
      "Stack Docker opérationnelle, documentation et démo validées.",
      "Équipe : recette croisée, README et répétition soutenance.",
    ],
  ],
  [78, 152, 55, 110, 104]
);

addSectionTitle("5. Stratégie Docker et vérifications");
addBullet(
  "Dockerfile & compose.yaml",
  "Dockerfile multi-stage (deps → builder standalone → runner Alpine non-root). compose.yaml lance PostgreSQL 16 (healthcheck pg_isready + volume pgdata) et l'application (volume uploads_data:/app/uploads), applique prisma migrate deploy au démarrage via docker-entrypoint.sh."
);
addBullet(
  "Exécutable dans l'environnement de l'agent",
  "npm run lint (tsc), npm run build (prisma generate + next build), npm run test:unit (Vitest sur règles métier et cas d'usage avec doubles en mémoire)."
);
addBullet(
  "À exécuter sur votre machine locale (Docker / PostgreSQL)",
  "docker compose up --build -d, docker compose exec app npx prisma db seed, npm run test:integration (base PostgreSQL isolée), npm run test:e2e (Playwright contre Docker) et contrôle de persistance après docker compose down && docker compose up -d."
);

addSectionTitle("6. Choix techniques clés à défendre en soutenance");
addBullet(
  "Clean Architecture proportionnée",
  "Les règles métier (machine à états, permissions, scoring de similarité, calcul du délai) sont indépendantes de Next.js et Prisma, donc testables rapidement et sans base de données."
);
addBullet(
  "Intégrité en base et concurrence",
  "L'unicité du soutien repose sur @@unique([reportId, userId]) côté PostgreSQL (et pas seulement un check applicatif), et l'historique de statut est écrit dans la même transaction que la mise à jour du signalement."
);
addBullet(
  "Calcul du délai de résolution",
  "Moyenne des durées (resolvedAt - createdAt) en heures sur les signalements résolus ; renvoie explicitement null lorsqu'aucun signalement n'est résolu afin d'éviter un 0 h trompeur."
);
addBullet(
  "Stockage photo sécurisé",
  "Validation MIME et taille (≤ 5 Mo), écriture dans UPLOAD_DIR monté sur volume Docker persistant, restitution via /api/uploads/[filename] avec protection contre le path traversal."
);

// Pied de page numéroté
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc
    .font("Sans")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `LocalImpact — Plan d'architecture et de réalisation   |   Page ${i + 1} / ${range.count}`,
      doc.page.margins.left,
      doc.page.height - 32,
      { width: pageWidth, align: "center" }
    );
}

doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

console.log(`PDF généré : ${OUTPUT_PATH}`);
