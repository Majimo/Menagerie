import { expect, type Page, test } from '@playwright/test';
import { openGame } from './helpers';

// Construction à la souris (et au doigt) comme un joueur : outils, aperçu, commandes, messages.

async function screenOf(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const point = await page.evaluate((tile) => window.__game?.tileToScreen(tile), { x, y });
  if (!point) throw new Error('Position écran indisponible');
  return point;
}

/** Coin nord-ouest de la tuile (x, y) : les clôtures se tracent d'un coin à l'autre. */
const corner = (page: Page, x: number, y: number) => screenOf(page, x - 0.5, y - 0.5);

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

const state = (page: Page) => page.evaluate(() => window.__game?.getState());

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Souris : testé sur desktop et grand écran');
  await openGame(page, { scenario: 'empty-map' });
  await page.evaluate(() => window.__game?.setCamera('mid', { x: 12, y: 12 }));
});

test('poser un chemin débite son coût et met à jour l’argent affiché', async ({ page }) => {
  await page.getByRole('button', { name: 'Chemin' }).click();
  const target = await screenOf(page, 12, 12);
  await page.mouse.click(target.x, target.y);
  const after = await state(page);
  expect(after?.world.tiles[12 * 48 + 12]).toBe(5); // 'path'
  expect(after?.money).toBe(49_995);
  await expect(page.getByTestId('money')).toHaveText(/49\s?995/);
});

test('fermer un enclos à la clôture : détecté, surface affichée au survol', async ({ page }) => {
  await page.getByRole('button', { name: 'Clôture' }).click();
  await drag(page, await corner(page, 10, 10), await corner(page, 15, 14)); // 5 × 4 tuiles
  const after = await state(page);
  const enclosures = Object.values(after?.enclosures ?? {});
  expect(enclosures.map((e) => e.area)).toEqual([20]);
  expect(after?.money).toBe(50_000 - 18 * 10);

  await page.keyboard.press('Escape'); // plus d'outil : le survol montre l'enclos
  await expect(page.getByRole('button', { name: 'Clôture' })).toHaveAttribute('aria-pressed', 'false');
  const inside = await screenOf(page, 12, 12);
  await page.mouse.move(inside.x, inside.y);
  await expect(page.getByTestId('tooltip')).toHaveText(/Enclos n° \d+ : 20 tuiles/);
});

test('peindre un biome sur une zone', async ({ page }) => {
  await page.getByRole('button', { name: 'Biome' }).click();
  await page.getByRole('button', { name: 'Forêt' }).click();
  await drag(page, await screenOf(page, 10, 10), await screenOf(page, 12, 11));
  const after = await state(page);
  const forest = after?.world.tiles.filter((code) => code === 2).length;
  expect(forest).toBe(6);
  expect(after?.money).toBe(50_000 - 6 * 2);
});

test('une commande invalide affiche un message clair', async ({ page }) => {
  await page.evaluate(() => window.__game?.setCamera('mid', { x: 21, y: 45 }));
  await page.getByRole('button', { name: 'Biome' }).click();
  const entrance = await screenOf(page, 21, 47);
  await page.mouse.click(entrance.x, entrance.y);
  await expect(page.getByRole('status')).toHaveText('L’entrée et la sortie du zoo ne se modifient pas.');
  expect((await state(page))?.money).toBe(50_000);
});

test('l’aperçu annonce le coût avant de construire', async ({ page }) => {
  await page.getByRole('button', { name: 'Chemin' }).click();
  const start = await screenOf(page, 8, 8);
  const end = await screenOf(page, 13, 8);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await expect(page.getByTestId('tooltip')).toContainText('Coût : 30');
  await page.keyboard.press('Escape'); // annule le glisser : rien n'est construit
  await page.mouse.up();
  expect((await state(page))?.money).toBe(50_000);
});

test('démolir une clôture rembourse la moitié', async ({ page }) => {
  await page.evaluate(() =>
    window.__game?.dispatch({ type: 'PlaceFence', edge: { axis: 'h', x: 12, y: 12 } }),
  );
  await page.getByRole('button', { name: 'Démolir' }).click();
  const edge = await screenOf(page, 12, 11.5); // milieu de l'arête nord de la tuile (12, 12)
  await page.mouse.click(edge.x, edge.y);
  const after = await state(page);
  expect(after?.world.fencesH[12 * 48 + 12]).toBe(0);
  expect(after?.money).toBe(50_000 - 10 + 5);
});

test('les outils se pilotent au clavier', async ({ page }) => {
  const path = page.getByRole('button', { name: 'Chemin' });
  await path.focus();
  await page.keyboard.press('Enter');
  await expect(path).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clôture' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(path).toHaveAttribute('aria-pressed', 'false');
});
