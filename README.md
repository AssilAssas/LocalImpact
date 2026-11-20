<div align="center">

![LocalImpact — Signalement et suivi des incidents sur campus](docs/assets/hero-banner.svg)

# 🛠️ LocalImpact

**Plateforme full-stack de signalement, de priorisation communautaire et de suivi d'incidents sur campus.**

⚡ **Next.js 15 App Router** · ⚛️ **React 19** · 🔷 **TypeScript strict** · 🐘 **PostgreSQL 16** · 🧬 **Prisma ORM** · 🛡️ **Zod** · 🐳 **Docker Compose**

</div>

---

## 📑 Sommaire

- [✨ Fonctionnalités clés](#-fonctionnalités-clés)
- [🏛️ Architecture & Clean Architecture](#️-architecture--clean-architecture)
- [🗄️ Modèle de données & intégrité PostgreSQL](#️-modèle-de-données--intégrité-postgresql)
- [🔐 Authentification, session & contrôle d'accès (RBAC)](#-authentification-session--contrôle-daccès-rbac)
- [🌐 Référence complète des endpoints API](#-référence-complète-des-endpoints-api)
- [🖥️ Routes applicatives (App Router)](#️-routes-applicatives-app-router)
- [⚙️ Logique métier & algorithmes](#️-logique-métier--algorithmes)
- [🐳 Démarrage rapide avec Docker Compose](#-démarrage-rapide-avec-docker-compose)
- [💻 Développement local & variables d'environnement](#-développement-local--variables-denvironnement)
- [🧪 Stratégie de tests & qualité](#-stratégie-de-tests--qualité)
- [🚀 Déploiement en production](#-déploiement-en-production)
- [⚠️ Limites techniques connues](#️-limites-techniques-connues)

---

## ✨ Fonctionnalités clés

- 👤 **Comptes et rôles** : inscription publique créant systématiquement un compte `USER`, connexion sécurisée, et gestion des rôles (`USER`, `MANAGER`, `ADMIN`) réservée à l'administrateur.
- 📝 **Signalements enrichis** : création avec titre, description, catégorie, lieu et photo facultative (`JPEG` / `PNG` / `WebP` ≤ 5 Mo) stockée sur volume persistant.
- 🔍 **Détection proactive de doublons** : lors de la saisie d'un nouveau signalement, analyse en temps réel des incidents actifs similaires (catégorie, lieu et mots significatifs du titre) avec soutien direct en un clic.
- 👍 **Soutien unique garanti en base** : un utilisateur ne peut soutenir un même signalement qu'une seule fois, y compris face à des requêtes simultanées (`@@unique([reportId, userId])`).
- 🔄 **Cycle de vie strict et traçable** : progression ordonnée `NOUVEAU → PRIS_EN_CHARGE → EN_COURS → RESOLU`, description d'intervention obligatoire à la résolution et journalisation transactionnelle dans `StatusHistory`.
- 💬 **Fil de commentaires** : échanges horodatés sur chaque fiche pour apporter ou demander des précisions.
- 📊 **Tableau de bord analytique** : répartition par statut et par catégorie, total des soutiens et délai moyen/médian de résolution calculés en direct sur les données persistantes.

---

## 🏛️ Architecture & Clean Architecture

L'application suit une **Clean Architecture proportionnée** qui isole strictement les règles métier du framework web (**Next.js**) et de l'ORM (**Prisma**).

![Flux Clean Architecture de LocalImpact](docs/assets/architecture-flow.svg)

### Principes de séparation des couches

| Couche | Répertoire | Responsabilité | Dépendances autorisées |
| :--- | :--- | :--- | :--- |
| **🟢 Domaine** | `src/domain/` | Entités, types, erreurs typées, machine à états, permissions RBAC, scoring de similarité, calcul des statistiques | **Aucune** (TypeScript pur uniquement) |
| **🔵 Application** | `src/application/` | Cas d'usage métier, ports/interfaces (`Repository`, `SessionPort`, `FileStoragePort`), schémas **Zod** partagés | `src/domain/`, `zod` |
| **🟡 Infrastructure** | `src/infrastructure/` | Adaptateurs concrets : dépôts **Prisma**, hachage `bcryptjs`, session JWT `jose`, stockage local `LocalFileStorage` | `src/domain/`, `src/application/`, `@prisma/client`, `jose`, `bcryptjs` |
| **🟣 Présentation** | `src/app/` & `src/components/` | Pages Server/Client Components, Route Handlers HTTP minces, gestion des états de chargement, vide et erreur | `src/application/`, `src/infrastructure/container.ts`, React/Next.js |

<details>
<summary>📂 <strong>Explorer l'arborescence complète du projet</strong></summary>

```text
.
├── prisma/
│   ├── migrations/
│   │   ├── migration_lock.toml
│   │   └── 20261120000000_init/migration.sql
│   ├── schema.prisma                        # Schéma PostgreSQL, index et contraintes
│   └── seed.ts                              # Jeu de données idempotent (3 rôles)
├── src/
│   ├── domain/
│   │   ├── errors.ts                        # DomainError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError
│   │   ├── report-rules.ts                  # Machine à états stricte, RBAC transitions & attribution
│   │   ├── similarity.ts                    # Moteur lexical de détection de doublons actifs
│   │   ├── stats.ts                         # Agrégations KPI et calcul du délai de résolution
│   │   └── types.ts                         # Enums, libellés et contrats métier
│   ├── application/
│   │   ├── ports.ts                         # Interfaces UserRepository, ReportRepository, SessionPort, FileStoragePort
│   │   ├── validation.ts                    # Schémas Zod client/serveur & validation photo
│   │   └── use-cases/
│   │       ├── auth.ts                      # Inscription, connexion, liste/promotion utilisateurs
│   │       └── reports.ts                   # CRUD signalements, soutiens, commentaires, attribution, statuts, stats
│   ├── infrastructure/
│   │   ├── auth/
│   │   │   ├── current-user.ts              # Résolution session + relecture du rôle courant en base
│   │   │   ├── password.ts                  # Adaptateur bcryptjs
│   │   │   └── session.ts                   # Cookie HttpOnly JWT HS256 (jose) + vérification Origin
│   │   ├── db/prisma.ts                     # Singleton PrismaClient
│   │   ├── http/api-response.ts             # Mapping centralisé DomainError → réponse HTTP JSON
│   │   ├── repositories/
│   │   │   ├── prisma-report-repository.ts  # Requêtes paramétrées, gestion P2002 et $transaction
│   │   │   └── prisma-user-repository.ts    # Persistance utilisateurs
│   │   ├── storage/local-file-storage.ts    # Stockage persistant avec confinement anti path-traversal
│   │   └── container.ts                     # Injection des dépendances
│   ├── components/                          # Composants UI réutilisables et accessibles
│   └── app/                                 # Pages Next.js App Router & Route Handlers /api/*
├── tests/
│   ├── helpers/in-memory-repos.ts           # Doublures en mémoire fidèles aux contraintes SQL
│   ├── unit/                                # Tests unitaires domaine & acceptation cas d'usage
│   ├── integration/                         # Tests d'intégration PostgreSQL isolés
│   └── e2e/                                 # Scénarios navigateur Playwright
├── scripts/
│   └── dev.mjs                              # Wrapper CLI dev Next.js
├── Dockerfile                               # Build multi-stage standalone Alpine
├── compose.yaml                             # App + PostgreSQL 16 + volumes + profil test
├── docker-entrypoint.sh                     # Attente DB + prisma migrate deploy + start
└── .env.example                             # Variables d'environnement documentées
```

</details>

---

## 🗄️ Modèle de données & intégrité PostgreSQL

La persistance repose sur **PostgreSQL 16** piloté par **Prisma** (`prisma/schema.prisma`).

```mermaid
erDiagram
    User ||--o{ Report : "crée (authorId)"
    User ||--o{ Report : "traite (assignedToId)"
    User ||--o{ Support : "soutient"
    User ||--o{ Comment : "rédige"
    User ||--o{ StatusHistory : "modifie"
    Report ||--o{ Support : "reçoit"
    Report ||--o{ Comment : "contient"
    Report ||--o{ StatusHistory : "trace"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        Role role
        datetime createdAt
    }
    Report {
        string id PK
        string title
        string description
        Category category
        string location
        string photoPath
        ReportStatus status
        string resolutionNote
        datetime resolvedAt
        string authorId FK
        string assignedToId FK
        datetime createdAt
        datetime updatedAt
    }
    Support {
        string id PK
        string reportId FK
        string userId FK
        datetime createdAt
    }
    Comment {
        string id PK
        string content
        string reportId FK
        string authorId FK
        datetime createdAt
    }
    StatusHistory {
        string id PK
        string reportId FK
        ReportStatus fromStatus
        ReportStatus toStatus
        string note
        string changedById FK
        datetime createdAt
    }
```

### Contraintes critiques et indexation

- 🔒 **Unicité du soutien en concurrence** : index unique composite `@@unique([reportId, userId])` sur `Support`. En cas de double requête simultanée, PostgreSQL rejette la seconde insertion (`P2002`), traduite en `409 Conflict` par `PrismaReportRepository`.
- ⚛️ **Atomicité statut + historique** : `transitionStatusAtomic` encapsule la mise à jour de `Report` (`status`, `resolvedAt`, `resolutionNote`) et la création de l'entrée `StatusHistory` dans un unique `prisma.$transaction(...)`.
- ⚡ **Index de recherche** : index composites et ciblés sur `Report(status, category)`, `Report(location)`, `Report(assignedToId)`, `Report(createdAt)`, `Comment(reportId, createdAt)` et `StatusHistory(reportId, createdAt)`.

---

## 🔐 Authentification, session & contrôle d'accès (RBAC)

### Stratégie de session
- **Cookie `HttpOnly` signé (`jose`, algorithme `HS256`)** nommé `localimpact_session` (durée 7 jours).
- Les mots de passe sont hachés côté serveur avec **`bcryptjs`** (coût 10) et ne sont jamais renvoyés dans les projections publiques (`UserPublic`).
- **Validation fraîche des droits** : `getCurrentSessionUser()` vérifie le JWT puis relit l'utilisateur en base afin qu'une promotion ou révocation de rôle prenne effet immédiatement sans attendre l'expiration du cookie.
- **Protection CSRF / Origine** : toutes les mutations (`POST`, `PATCH`) vérifient la correspondance entre `Origin` et `Host` / `X-Forwarded-Host` via `verifySameOriginRequest()`.

### Matrice des permissions (appliquée côté serveur)

| Opération | Anonyme | `USER` | `MANAGER` (non assigné) | `MANAGER` (assigné) | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 👀 Consulter signalements, fiches & statistiques | ✅ | ✅ | ✅ | ✅ | ✅ |
| ➕ Créer un signalement / Soutenir / Commenter | ❌ `401` | ✅ | ✅ | ✅ | ✅ |
| 🔄 Faire avancer le statut (`NOUVEAU → … → RESOLU`) | ❌ `401` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| 📌 Attribuer un signalement à un `MANAGER` | ❌ `401` | ❌ `403` | ❌ `403` | ❌ `403` | ✅ |
| 👥 Lister les utilisateurs & modifier les rôles | ❌ `401` | ❌ `403` | ❌ `403` | ❌ `403` | ✅ |

---

## 🌐 Référence complète des endpoints API

Toutes les routes API suivent le format JSON `{ error, code }` en cas d'erreur (`400` validation, `401` non authentifié, `403` interdit, `404` introuvable, `409` conflit).

### 🩺 Santé système

| Méthode | Endpoint | Accès | Description | Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Vérifie la disponibilité de l'application et exécute `SELECT 1` sur PostgreSQL. | `200`, `503` |

### 🔑 Authentification

| Méthode | Endpoint | Accès | Corps / Paramètres | Comportement & Règles | Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | `{ name, email, password }` | Valide via Zod, **force `role = "USER"`**, vérifie l'unicité de l'e-mail, crée le compte et pose le cookie de session. | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Vérifie le hash `bcryptjs` et émet le cookie `HttpOnly` signé. | `200`, `400`, `401` |
| `POST` | `/api/auth/logout` | Public | — | Expire immédiatement le cookie `localimpact_session`. | `200`, `403` |
| `GET` | `/api/auth/me` | Optionnel | — | Retourne `{ user }` frais depuis PostgreSQL ou `{ user: null }`. | `200` |

### 📋 Signalements, soutiens & commentaires

| Méthode | Endpoint | Accès | Corps / Paramètres | Comportement & Règles | Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/reports` | Public | Query : `search`, `category`, `status`, `location`, `assignedToId` | Filtre insensible à la casse (`Prisma`), inclut compteurs et `supportedByViewer`. | `200`, `400` |
| `POST` | `/api/reports` | Authentifié | `multipart/form-data` ou `application/json` (`title`, `description`, `category`, `location`, `photo?`) | Valide Zod + photo (`jpeg/png/webp` ≤ 5 Mo), crée le signalement (`NOUVEAU`) et son premier historique dans la même transaction. | `201`, `400`, `401` |
| `GET` | `/api/reports/similar` | Public | Query : `title`, `category?`, `location?` | Analyse les signalements actifs (`status != RESOLU`) et renvoie le top 5 avec score et raisons. | `200` |
| `GET` | `/api/reports/[id]` | Public | Param : `id` | Retourne la fiche détaillée, les commentaires et l'historique chronologique des transitions. | `200`, `404` |
| `POST` | `/api/reports/[id]/support` | Authentifié | Param : `id` | Enregistre un soutien unique (`@@unique([reportId, userId])`) et retourne `{ supportCount }`. | `201`, `401`, `404`, `409` |
| `POST` | `/api/reports/[id]/comments` | Authentifié | `{ content }` (2–1000 car.) | Ajoute un commentaire rattaché à l'utilisateur de session. | `201`, `400`, `401`, `404` |
| `PATCH` | `/api/reports/[id]/assign` | `ADMIN` | `{ assignedToId }` | Vérifie que la cible existe et possède le rôle `MANAGER`, puis attribue le signalement. | `200`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/reports/[id]/status` | `ADMIN` ou `MANAGER` assigné | `{ targetStatus, note? }` | Applique la machine à états stricte, exige `note` ≥ 10 car. pour `RESOLU`, met à jour `Report` et `StatusHistory` atomiquement. | `200`, `400`, `401`, `403`, `404` |

### 📊 Statistiques, administration & médias

| Méthode | Endpoint | Accès | Corps / Paramètres | Comportement & Règles | Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/stats` | Public | — | Calcule en direct les compteurs par statut/catégorie et les délais de résolution depuis PostgreSQL. | `200` |
| `GET` | `/api/admin/users` | `ADMIN` | — | Liste tous les comptes sans jamais exposer `passwordHash`. | `200`, `401`, `403` |
| `PATCH` | `/api/admin/users/[id]/role` | `ADMIN` | `{ role: "USER" \| "MANAGER" \| "ADMIN" }` | Met à jour le rôle d'un utilisateur (interdit à un admin de retirer ses propres droits). | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/uploads/[filename]` | Public | Param : `filename` | Sert les photos persistées avec validation regex stricte, vérification `path.resolve` anti *path traversal* et `X-Content-Type-Options: nosniff`. | `200`, `404` |

<details>
<summary>🧪 <strong>Exemples de payloads JSON (création, transition & statistiques)</strong></summary>

```json
// PATCH /api/reports/[id]/status (passage à RESOLU)
{
  "targetStatus": "RESOLU",
  "note": "Remplacement du câble HDMI et réinitialisation du vidéoprojecteur."
}

// GET /api/stats (réponse lorsque des signalements sont résolus)
{
  "stats": {
    "totalReports": 5,
    "activeReports": 3,
    "resolvedReports": 2,
    "totalSupports": 7,
    "byStatus": {
      "NOUVEAU": 1,
      "PRIS_EN_CHARGE": 1,
      "EN_COURS": 1,
      "RESOLU": 2
    },
    "byCategory": {
      "MATERIEL": 1,
      "ACCESSIBILITE": 1,
      "ECLAIRAGE": 1,
      "PROPRETE": 1,
      "INFORMATIQUE": 1,
      "AUTRE": 0
    },
    "averageResolutionHours": 5.0,
    "medianResolutionHours": 5.0
  }
}
```

</details>

---

## 🖥️ Routes applicatives (App Router)

| Route | Rendu | Accès | Rôle de l'écran |
| :--- | :--- | :--- | :--- |
| `/` | Server + Client | Public | Catalogue filtrable (mot-clé, catégorie, lieu, statut) avec états chargement, vide et erreur |
| `/connexion` | Server + Client | Anonyme | Formulaire de connexion validé par Zod |
| `/inscription` | Server + Client | Anonyme | Création de compte standard (`USER`) |
| `/signalements/nouveau` | Server + Client | Authentifié | Formulaire + aperçu photo + panneau temps réel des doublons actifs similaires |
| `/signalements/[id]` | Server + Client | Public (lecture) | Fiche complète, soutien unique, photo, attribution admin, progression statut, historique et commentaires |
| `/tableau-de-bord` | Server | Public | KPI globaux, délai moyen/médian et répartitions visuelles par statut et catégorie |
| `/responsable` | Server | `MANAGER` / `ADMIN` | File des interventions assignées avec accès direct au traitement |
| `/admin/utilisateurs` | Server + Client | `ADMIN` | Gestion des rôles des utilisateurs du campus |

---

## ⚙️ Logique métier & algorithmes

### 1. Machine à états (`src/domain/report-rules.ts`)
- Transitions autorisées :
  `NOUVEAU` → `PRIS_EN_CHARGE` → `EN_COURS` → `RESOLU`
- Tout saut d'étape, retour en arrière ou modification d'un signalement déjà `RESOLU` lève une `ValidationError` (`400`).
- Le passage à `RESOLU` impose une note d'intervention d'au moins **10 caractères** après `trim()`.

### 2. Détection de doublons actifs (`src/domain/similarity.ts`)
- Exclut tous les signalements dont le statut est `RESOLU`.
- Normalise les chaînes (suppression des accents, ponctuation, mots vides français et tokens `< 3` caractères).
- Barème :
  - Même catégorie : **+3 pts**
  - Même lieu (exact : **+3 pts**, correspondance partielle : **+2 pts**)
  - Chaque mot significatif du titre partagé (ou préfixe ≥ 4 car.) : **+2 pts**
- Retourne le top 5 des correspondances ayant un signal pertinent et un score ≥ 3, trié par score puis nombre de soutiens.

### 3. Calcul du délai de résolution (`src/domain/stats.ts`)
- Pour chaque signalement résolu ayant `resolvedAt !== null`, calcule `(resolvedAt - createdAt) / 3_600_000` (en heures, arrondi à 1 décimale).
- Retourne `averageResolutionHours` et `medianResolutionHours`.
- **Cas limite 0 résolu** : renvoie explicitement `null` (affiché *« Aucun signalement résolu »* dans l'interface) afin d'éviter une valeur `0 h` trompeuse.

---

## 🐳 Démarrage rapide avec Docker Compose

```bash
# 1. Créer la configuration locale
cp .env.example .env

# 2. Construire et démarrer l'application + PostgreSQL 16 (migrations appliquées au démarrage)
docker compose up --build -d

# 3. Vérifier l'état de santé (app + DB)
curl http://localhost:3000/api/health
# -> {"status":"ok","db":"connected"}

# 4. Charger les données et comptes de démonstration (relançable sans doublons)
docker compose exec app npx prisma db seed
```

L'application est disponible sur **`http://localhost:3000`**.

### Persistance des données et des photos
`compose.yaml` monte deux volumes nommés :
- `pgdata` → `/var/lib/postgresql/data` (base PostgreSQL)
- `uploads_data` → `/app/uploads` (photos téléversées)

Un redémarrage (`docker compose down && docker compose up -d`) conserve intégralement les comptes, signalements, historiques et images.

### Comptes de démonstration (`prisma/seed.ts`)

| Rôle | Nom | E-mail | Mot de passe |
| :--- | :--- | :--- | :--- |
| 🛡️ **Administrateur** | Nadia Benali | `admin@campus.fr` | `AdminCampus2026!` |
| 🔧 **Responsable (IT)** | Karim Haddad | `resp.info@campus.fr` | `RespCampus2026!` |
| 🔧 **Responsable (Bâtiment)** | Claire Moreau | `resp.batiment@campus.fr` | `RespCampus2026!` |
| 👤 **Utilisateur** | Alice Martin | `alice@campus.fr` | `UserCampus2026!` |
| 👤 **Utilisateur** | Bob Diallo | `bob@campus.fr` | `UserCampus2026!` |

---

## 💻 Développement local & variables d'environnement

### Variables d'environnement (`.env.example`)

| Variable | Description | Valeur par défaut Docker |
| :--- | :--- | :--- |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL principale | `postgresql://localimpact:localimpact@db:5432/localimpact?schema=public` |
| `DATABASE_URL_TEST` | Base PostgreSQL isolée pour les tests d'intégration | `postgresql://localimpact:localimpact@localhost:5433/localimpact_test?schema=public` |
| `SESSION_SECRET` | Secret HMAC-SHA256 pour signer les cookies de session (≥ 32 car. en prod) | Généré ou défini dans `.env` |
| `COOKIE_SECURE` | Mettre `"true"` derrière HTTPS ; `"false"` en HTTP local Docker | `"false"` |
| `UPLOAD_DIR` | Répertoire de stockage des photos uploadées | `/app/uploads` |

### Commandes locales (hors Docker)

```bash
npm install --legacy-peer-deps
npm run prisma:generate
npm run lint        # Vérification TypeScript strict (tsc --noEmit)
npm run build       # Génération Prisma + build Next.js production
npm run dev         # Serveur de développement sur http://localhost:3000
```

---

## 🧪 Stratégie de tests & qualité

| Niveau | Outil | Périmètre couvert | Commande |
| :--- | :--- | :--- | :--- |
| **Unitaires & Cas d'usage** | Vitest (`tests/unit/`) | Transitions, RBAC, scoring de similarité, statistiques (`null` si 0 résolu), création avec/sans photo, rejet fichiers invalides, soutien simultané | `npm run test:unit` |
| **Intégration PostgreSQL** | Vitest (`tests/integration/`) | Contrainte `@@unique([reportId, userId])` sous requêtes concurrentes réelles (`Promise.all`), transactions `StatusHistory`, stockage disque et stats | `npm run test:integration` |
| **End-to-End (E2E)** | Playwright (`tests/e2e/`) | Parcours complet navigateur : inscription, création, soutien, commentaire, attribution admin, résolution avec note et tableau de bord | `npm run test:e2e` |

### Exécuter la suite complète sur base isolée

```bash
# 1. Démarrer la base PostgreSQL dédiée aux tests (port 5433)
docker compose --profile test up -d db-test

# 2. Appliquer les migrations sur la base de test
DATABASE_URL="postgresql://localimpact:localimpact@localhost:5433/localimpact_test?schema=public" npx prisma migrate deploy

# 3. Lancer les tests unitaires et d'intégration
npm run test:unit
DATABASE_URL_TEST="postgresql://localimpact:localimpact@localhost:5433/localimpact_test?schema=public" npm run test:integration

# 4. Lancer les tests E2E contre la stack Docker Compose
docker compose up --build -d
docker compose exec app npx prisma db seed
npx playwright install chromium
npm run test:e2e
```

---

## 🚀 Déploiement en production

1. Définir `DATABASE_URL`, un `SESSION_SECRET` aléatoire d'au moins 32 caractères, `COOKIE_SECURE="true"` (derrière un reverse proxy TLS/HTTPS) et monter `UPLOAD_DIR` sur un stockage persistant.
2. Construire l'image Docker multi-stage :
   ```bash
   docker build -t localimpact:latest .
   ```
3. Au démarrage du conteneur, `docker-entrypoint.sh` attend la disponibilité de PostgreSQL, exécute `npx prisma migrate deploy` puis démarre `node server.js` sur le port `3000` sous l'utilisateur non-root `nextjs`.
4. Configurer la sonde de disponibilité HTTP sur `GET /api/health`.

---

## ⚠️ Limites techniques connues

- **Stockage média mono-instance** : les photos sont écrites dans un volume local (`UPLOAD_DIR`) ; un déploiement horizontal multi-réplicas nécessiterait un stockage objet partagé (S3 / MinIO).
- **Appariement lexical des doublons** : la détection de similarité repose sur la normalisation textuelle et les préfixes de mots (sans indexation vectorielle ni gestion avancée des synonymes).
- **Notifications** : la plateforme n'envoie pas encore d'e-mails ou de notifications temps réel lors d'une attribution ou d'un changement de statut.
