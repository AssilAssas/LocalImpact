import { expect, test } from "@playwright/test";

test.describe("Parcours complet LocalImpact (E2E)", () => {
  test("un utilisateur crée un signalement, un autre soutient, l'admin attribue et le responsable résout", async ({
    page,
  }) => {
    const uniqueSuffix = Date.now();
    const userEmail = `etudiant-${uniqueSuffix}@campus.fr`;

    // 1. Inscription publique d'un utilisateur standard
    await page.goto("/inscription");
    await page.getByLabel("Nom complet").fill("Étudiant Test");
    await page.getByLabel("Adresse e-mail").fill(userEmail);
    await page.getByLabel("Mot de passe").fill("MotDePasse123!");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page).toHaveURL("/");

    // 2. Création d'un signalement sans photo
    await page.getByRole("link", { name: "Signaler un problème" }).first().click();
    await expect(page).toHaveURL("/signalements/nouveau");

    const title = `Prise réseau cassée ${uniqueSuffix}`;
    await page.getByLabel("Titre du signalement").fill(title);
    await page.getByLabel("Catégorie").selectOption("INFORMATIQUE");
    await page
      .getByLabel("Description détaillée")
      .fill("La prise murale de la rangée centrale est arrachée.");
    await page.getByRole("button", { name: "Publier le signalement" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const reportUrl = page.url();

    // 3. Soutien unique et commentaire
    await page.getByRole("button", { name: /Soutenir/ }).click();
    await expect(page.getByRole("button", { name: /Soutenu/ })).toBeVisible();

    await page
      .getByLabel("Ajouter un commentaire")
      .fill("Problème confirmé sur le poste 4.");
    await page.getByRole("button", { name: "Publier le commentaire" }).click();
    await expect(
      page.getByText("Problème confirmé sur le poste 4.")
    ).toBeVisible();

    // 4. Déconnexion et connexion en administrateur (seed)
    await page.getByRole("button", { name: /Quitter/ }).click();
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("admin@campus.fr");
    await page.getByLabel("Mot de passe").fill("AdminCampus2026!");
    await page.getByRole("button", { name: "Connexion" }).click();
    await expect(page).toHaveURL("/");

    // Attribution au responsable informatique
    await page.goto(reportUrl);
    await page
      .getByLabel("Responsable en charge")
      .selectOption({ index: 1 });
    await page
      .getByRole("button", { name: "Enregistrer l'attribution" })
      .click();
    await expect(page.getByText("Responsable attribué avec succès.")).toBeVisible();

    // Avancement de statut jusqu'à RESOLU avec description obligatoire
    await page
      .getByRole("button", { name: /Passer à « Pris en charge »/ })
      .click();
    await page.getByRole("button", { name: /Passer à « En cours »/ }).click();

    await page
      .getByLabel(/Description de l'intervention/)
      .fill("Prise RJ45 remplacée et testée au testeur câble.");
    await page.getByRole("button", { name: /Passer à « Résolu »/ }).click();

    await expect(
      page.getByText("Prise RJ45 remplacée et testée au testeur câble.")
    ).toBeVisible();

    // Vérification du tableau de bord
    await page.goto("/tableau-de-bord");
    await expect(
      page.getByRole("heading", { name: "Tableau de bord" })
    ).toBeVisible();
  });
});
