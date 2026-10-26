import { expect, type Page, test } from '@playwright/test';
import { openGame } from './helpers';

// Itération 4 : boucle de jeu complète vue par le joueur (écran titre, tutoriel, objectifs, sauvegarde, défaite).

/** Ouvre le jeu comme un joueur : sans scénario, l'écran titre s'affiche. */
async function openTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined);
  await page.evaluate(() => window.__game?.ready());
}

const state = (page: Page) => page.evaluate(() => window.__game?.getState());

test('écran titre → nouvelle partie : tutoriel et premier objectif affichés, la partie avance', async ({
  page,
}) => {
  await openTitle(page);
  const title = page.getByRole('dialog', { name: 'Ménagerie' });
  await expect(title).toBeVisible();
  // Aucune sauvegarde : seul « Nouvelle partie » est proposé, et il a le focus.
  await expect(title.getByRole('button', { name: /Continuer/ })).toHaveCount(0);
  await expect(title.getByRole('button', { name: 'Nouvelle partie' })).toBeFocused();
  const tickAtTitle = (await state(page))?.tick ?? 0;
  await page.waitForTimeout(300);
  expect((await state(page))?.tick).toBe(tickAtTitle);

  await title.getByRole('button', { name: 'Nouvelle partie' }).click();
  await expect(title).toBeHidden();
  const tutorial = page.getByTestId('tutorial');
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toContainText('Chemin');
  await expect(tutorial).toContainText('Aide 1/5');
  await expect(page.getByTestId('objectives')).toContainText('Objectif 1 sur 4 : Accueillir 2 espèces');
  await expect.poll(async () => (await state(page))?.tick ?? 0).toBeGreaterThan(0);

  // « Compris » passe à la bulle suivante ; « Passer le tutoriel » les ferme toutes.
  await tutorial.getByRole('button', { name: 'Compris' }).click();
  await expect(tutorial).toContainText('Aide 2/5');
  await tutorial.getByRole('button', { name: 'Passer le tutoriel' }).click();
  await expect(tutorial).toBeHidden();
});

test('le tutoriel avance tout seul quand le joueur fait ce qui est demandé', async ({ page }) => {
  await openTitle(page);
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  const tutorial = page.getByTestId('tutorial');
  await expect(tutorial).toContainText('Aide 1/5');
  await page.evaluate(() => {
    const game = window.__game;
    for (let y = 46; y >= 40; y--) game?.dispatch({ type: 'PlacePath', tile: { x: 21, y } });
    for (let y = 46; y >= 40; y--) game?.dispatch({ type: 'PlacePath', tile: { x: 26, y } });
    for (let x = 22; x <= 25; x++) game?.dispatch({ type: 'PlacePath', tile: { x, y: 40 } });
  });
  await expect(tutorial).toContainText('Aide 2/5');
  await expect(tutorial).toContainText('Clôture');
});

test('sauvegarder, recharger la page, continuer : la partie reprend à l’identique', async ({ page }) => {
  await openTitle(page);
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  await page.evaluate(() => {
    const game = window.__game;
    for (let y = 46; y >= 40; y--) game?.dispatch({ type: 'PlacePath', tile: { x: 21, y } });
    game?.dispatch({ type: 'SetTicketPrice', price: 22 });
  });
  await page.getByTestId('menu-button').click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect(menu.getByRole('status')).toContainText('Partie sauvegardée');
  // Le menu met la partie en pause : la sauvegarde stockée est exactement l'état en cours.
  const saved = await state(page);
  const stored = await page.evaluate(() => localStorage.getItem('menagerie.save'));
  expect(JSON.parse(stored ?? 'null')).toEqual(saved);
  await menu.getByRole('button', { name: 'Reprendre' }).click();
  await expect(menu).toBeHidden();

  await openTitle(page);
  const title = page.getByRole('dialog', { name: 'Ménagerie' });
  await title.getByRole('button', { name: 'Continuer (jour 1)' }).click();
  await expect(title).toBeHidden();
  // La partie reprend aussitôt : quelques ticks ont pu passer, le zoo construit est le même.
  const loaded = await state(page);
  expect(loaded?.seed).toBe(saved?.seed);
  expect(loaded?.tick).toBeGreaterThanOrEqual(saved?.tick ?? 0);
  expect(loaded?.world).toEqual(saved?.world);
  expect(loaded?.ticketPrice).toBe(22);
});

test('faillite : écran de fin, puis nouvelle partie', async ({ page }) => {
  await openGame(page, { scenario: 'bankrupt' });
  const end = page.getByRole('dialog', { name: 'Faillite' });
  await expect(end).toBeVisible();
  await expect(end).toContainText('10 jours de suite');
  await expect(end).toContainText('Objectifs atteints : 0 sur 4');
  // L'écran de fin ne se ferme pas avec Échap : il faut choisir.
  await page.keyboard.press('Escape');
  await expect(end).toBeVisible();
  await end.getByRole('button', { name: 'Nouvelle partie' }).click();
  await expect(end).toBeHidden();
  const fresh = await state(page);
  expect(fresh?.scenario.outcome).toBe('playing');
  expect(fresh?.money).toBe(50_000);
});

test('la faillite approche : une alerte compte les jours restants', async ({ page }) => {
  await openGame(page, { scenario: 'crisis' });
  await page.evaluate(() => window.__game?.advance(1200));
  await expect(page.getByTestId('alerts')).toContainText(/Faillite dans \d+ jour/);
});
