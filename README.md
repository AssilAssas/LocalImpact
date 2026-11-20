# LocalImpact — Signalement et suivi des problèmes du campus

Application web full-stack de signalement et de suivi d’incidents sur un campus universitaire, développée avec **Next.js App Router**, **React**, **TypeScript**, **PostgreSQL**, **Prisma** et **Zod**, selon une **Clean Architecture** proportionnée.

Le plan complet d’architecture, les jalons et la matrice d’exigences sont disponibles au format PDF dans [`docs/LocalImpact_Plan_Projet.pdf`](docs/LocalImpact_Plan_Projet.pdf).

---

## 1. Architecture et choix techniques

- **Séparation en couches (`src/`)** :
  - `src/domain/` : règles métier pures sans dépendance Next.js ni Prisma (machine à états `NOUVEAU → PRIS_EN_CHARGE → EN_COURS → RESOLU`, droits par rôle, algorithme de détection de doublons actifs, calcul du tableau de bord).
  - `src/application/` : cas d’usage, ports/interfaces et schémas de validation **Zod** partagés client/serveur.
  - `src/infrastructure/` : adaptateurs PostgreSQL/Prisma, session par cookie `HttpOnly` signé (**`jose`** JWT HS256), hachage **`bcryptjs`** et stockage local persistant des photos (`LocalFileStorage` avec validation MIME/taille et protection *path traversal*).
  - `src/app/` & `src/components/` : pages App Router, Route Handlers minces et interface accessible/responsive en français.
- **Session retenue** : cookie `HttpOnly` signé via `jose` (HS256), compatible nativement avec Next.js App Router (Server Components et Route Handlers), 100 % autonome hors-ligne en Docker local et couplé à une relecture du rôle courant en base sur chaque opération protégée.
- **Intégrité en base** :
  - Unicité du soutien garantie par contrainte PostgreSQL `@@unique([reportId, userId])` (gère la concurrence simultanée).
  - Transition de statut + entrée `StatusHistory` exécutées dans une transaction atomique `prisma.$transaction`.
- **Calcul du délai de résolution** : moyenne (et médiane) en heures de `(resolvedAt - createdAt)` sur les signalements résolus ; renvoie `null` lorsqu’aucun signalement n’est résolu (« Aucun signalement résolu »).

---

## 2. Démarrage rapide avec Docker Compose

```bash
# 1. Copier l'exemple de configuration
cp .env.example .env

# 2. Construire et démarrer l'application + PostgreSQL (migrations appliquées automatiquement)
docker compose up --build -d

# 3. Charger les comptes et données de démonstration (relançable sans doublons)
docker compose exec app npx prisma db seed
```

L’application est accessible sur `http://localhost:3000`.

### Persistance après redémarrage

`compose.yaml` déclare deux volumes nommés :
- `pgdata` pour les données PostgreSQL ;
- `uploads_data` monté sur `/app/uploads` pour les photos jointes aux signalements.

Pour vérifier la persistance :
1. Créez un signalement avec une photo sur `http://localhost:3000`.
2. Exécutez `docker compose down && docker compose up -d`.
3. Rechargez le signalement : les données et la photo restent accessibles.

---

## 3. Comptes de démonstration (seed)

| Rôle | Nom | E-mail | Mot de passe |
| :--- | :--- | :--- | :--- |
| **Administrateur** | Nadia Benali | `admin@campus.fr` | `AdminCampus2026!` |
| **Responsable** | Karim Haddad | `resp.info@campus.fr` | `RespCampus2026!` |
| **Responsable** | Claire Moreau | `resp.batiment@campus.fr` | `RespCampus2026!` |
| **Utilisateur** | Alice Martin | `alice@campus.fr` | `UserCampus2026!` |
| **Utilisateur** | Bob Diallo | `bob@campus.fr` | `UserCampus2026!` |

---

## 4. Développement local & tests

```bash
# Générer le client Prisma
npm run prisma:generate

# Vérifier le typage TypeScript et le build de production
npm run lint
npm run build

# Tests unitaires et d'acceptation (domaine + cas d'usage en mémoire)
npm run test:unit
```

### Tests d’intégration sur base PostgreSQL isolée

```bash
# Démarrer uniquement la base de test isolée (port 5433)
docker compose --profile test up -d db-test

# Appliquer les migrations sur la base de test
DATABASE_URL="postgresql://localimpact:localimpact@localhost:5433/localimpact_test?schema=public" npx prisma migrate deploy

# Lancer les tests d'intégration réels (concurrence soutien, RBAC, transactions)
DATABASE_URL_TEST="postgresql://localimpact:localimpact@localhost:5433/localimpact_test?schema=public" npm run test:integration
```

### Tests End-to-End (Playwright contre Docker Compose)

```bash
docker compose up --build -d
docker compose exec app npx prisma db seed
npx playwright install chromium
npm run test:e2e
```

---

## 5. Procédure de déploiement final

1. Configurer les variables d’environnement de production (`DATABASE_URL`, `SESSION_SECRET` aléatoire ≥ 32 caractères, `COOKIE_SECURE=true` derrière HTTPS, `UPLOAD_DIR` sur un volume persistant).
2. Construire l’image de production via `docker build -t localimpact:latest .` (ou `docker compose up --build -d`).
3. Le script `docker-entrypoint.sh` attend PostgreSQL, exécute `npx prisma migrate deploy` puis démarre le serveur standalone (`node server.js` sur le port `3000`).
4. Vérifier l’état de santé via `GET /api/health` (`{"status":"ok","db":"connected"}`).

---

## 6. Limites connues & déclaration d’usage de l’IA

### Limites connues
- Le stockage des photos repose sur un volume local (`UPLOAD_DIR`) adapté à une instance unique ; un déploiement multi-réplicas nécessiterait un stockage objet S3/MinIO partagé.
- La détection de doublons repose sur un appariement lexical (catégorie + lieu + racines de mots du titre) sans indexation vectorielle ni synonymes complexes.
- Pas de notifications e-mail en temps réel lors d’une attribution ou d’un changement de statut.

### Déclaration d’utilisation de l’IA
Des outils d’assistance par IA ont été utilisés pour structurer le plan d’architecture, générer le squelette Clean Architecture/tests et rédiger la documentation, avec revue, vérification des règles métier et validation manuelle des critères d’acceptation du cahier des charges.

---

## 7. Commits suggérés par jalon & scénario de soutenance

### Historique Git suggéré
1. `chore(jalon-1): initialise Next.js App Router, Prisma, Docker et socle Clean Architecture`
2. `feat(jalon-2): ajoute schema PostgreSQL, seed idempotent, adaptateurs et tests domaine`
3. `feat(jalon-3): implémente auth, signalements avec photo, détection de doublons, soutien unique et commentaires`
4. `feat(jalon-4): ajoute gestion des rôles admin, attribution, transitions transactionnelles et tableau de bord`
5. `docs(jalon-5): finalise E2E, vérifications Docker, README et plan PDF`

### Scénario de soutenance (5 minutes)
1. **Connexion & détection de doublons (1 min)** : se connecter avec `alice@campus.fr`, commencer un signalement « Projecteur en panne » en `Amphithéâtre principal` → montrer la remontée du signalement similaire actif et le soutien en 1 clic.
2. **Création & soutien unique (1 min)** : créer un nouveau signalement avec photo, constater le bouton « Soutenu » bloqué après un premier soutien (et expliquer la contrainte `@@unique([reportId, userId])`).
3. **Contrôle des rôles & résolution (1 min 30)** : se connecter avec `admin@campus.fr`, attribuer à `resp.info@campus.fr`, puis se connecter avec `resp.info@campus.fr` pour avancer jusqu’à `RESOLU` en montrant le refus sans description d’intervention et l’historique horodaté.
4. **Tableau de bord & architecture (1 min 30)** : afficher `/tableau-de-bord` (délai moyen calculé), montrer la séparation `domain` / `application` / `infrastructure` et les tests unitaires/intégration.
