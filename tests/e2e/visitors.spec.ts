import { expect, type Page, test } from '@playwright/test';
import { openGame } from './helpers';

// Visiteurs et économie comme un joueur : prix du billet, alertes, inspection d'un visiteur, bilan du jour.

const state = (page: Page) => page.evaluate(() => window.__game?.getState());

async function expectedVisitors(page: Page): Promise<number> {
  const text = (await page.getByTestId('expected-visitors').textContent()) ?? '';
  return Number(text.replace(/\D/g, ''));
}

test('le panneau Économie règle le prix du billet et annonce l’effet sur les arrivées', async ({ page }) => {
  await openGame(page, { scenario: 'busy-day' });
  await page.getByTestId('economy-button').click();
  await expect(page.getByTestId('inspector')).toContainText('Économie du zoo');
  const before = await expectedVisitors(page);
  // Clics rapides : ils s'additionnent même si le panneau n'est pas encore rafraîchi.
  for (let i = 0; i < 5; i++)
    await page.getByRole('button', { name: 'Augmenter le prix du billet de 5' }).click();
  await expect(page.getByTestId('ticket-price')).toContainText('40 par adulte, 20 par enfant');
  expect((await state(page))?.ticketPrice).toBe(40);
  await expect.poll(() => expectedVisitors(page)).toBeLessThan(before / 2);
  await expect(page.getByTestId('inspector')).toContainText('Trop cher');
});

test('en crise, les problèmes sont listés en haut de l’écran et mènent au bon panneau', async ({ page }) => {
  await openGame(page, { scenario: 'crisis' });
  const alerts = page.getByTestId('alerts');
  await expect(alerts).toContainText('bloqué');
  await expect(alerts).toContainText('Argent négatif');
  await expect(alerts).toContainText('sans chemin');
  await alerts.getByRole('button', { name: /sans chemin/ }).click();
  await expect(page.getByTestId('unreachable')).toBeVisible();
  // Sur écran étroit, le panneau ouvert masque le bandeau : on le referme d'abord.
  await page.getByRole('button', { name: 'Fermer le panneau' }).click();
  await alerts.getByRole('button', { name: /Argent négatif/ }).click();
  await expect(page.getByTestId('inspector')).toContainText('Économie du zoo');
});

test('un clic sur un visiteur ouvre son panneau', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Souris : desktop et grand écran');
  await openGame(page, { scenario: 'busy-day' });
  const target = await page.evaluate(() => {
    const game = window.__game;
    const visitor = Object.values(game?.getState().visitors ?? {}).find(
      (v) => v.state === 'viewing' && v.kind === 'adult',
    );
    if (visitor) game?.setCamera('close', { x: Math.floor(visitor.x), y: Math.floor(visitor.y) });
    return visitor ? { id: visitor.id, x: visitor.x, y: visitor.y } : null;
  });
  if (!target) throw new Error('Aucun visiteur en observation');
  // Le clic vise la position simulée du visiteur (son décalage d'affichage reste sous le rayon de sélection).
  const point = await page.evaluate(
    (t) => window.__game?.tileToScreen({ x: t.x - 0.5, y: t.y - 0.5 }),
    target,
  );
  if (!point) throw new Error('Position écran indisponible');
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId('inspector')).toContainText(`Adulte n° ${target.id}`);
  await expect(page.getByTestId('inspector')).toContainText('Observe l’enclos');
});

test('à minuit, le bilan du jour est annoncé et détaillé dans le panneau Économie', async ({ page }) => {
  await openGame(page, { scenario: 'busy-day' });
  // L'interface voit d'abord la partie chargée (sinon le passage de minuit ne serait pas une nouveauté).
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  // 13 h 24 → minuit : 10,6 heures de 50 ticks.
  await page.evaluate(() => window.__game?.advance(540));
  await expect(page.getByTestId('toast')).toContainText('Bilan du jour 1');
  await page.getByTestId('economy-button').click();
  const inspector = page.getByTestId('inspector');
  await expect(inspector).toContainText('Bilan du jour 1');
  await expect(inspector).toContainText('Billets');
  await expect(inspector).toContainText('Nourriture des animaux');
  await expect(inspector).toContainText('Entretien');
});

test('mouvement réduit : la scène ne s’anime pas quand le temps est arrêté', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page, { scenario: 'busy-day' });
  await page.evaluate(() => window.__game?.setCamera('close'));
  await page.waitForTimeout(200);
  const first = await page.locator('#scene').screenshot();
  await page.waitForTimeout(400);
  const second = await page.locator('#scene').screenshot();
  expect(first.equals(second)).toBe(true);
});
