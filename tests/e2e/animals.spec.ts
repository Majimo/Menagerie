import { expect, type Page, test } from '@playwright/test';
import { openGame } from './helpers';

// Animaux comme un joueur : achat, refus explicite, inspection à la souris, au doigt et au clavier, vitesse du jeu.

async function screenOf(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const point = await page.evaluate((tile) => window.__game?.tileToScreen(tile), { x, y });
  if (!point) throw new Error('Position écran indisponible');
  return point;
}

const state = (page: Page) => page.evaluate(() => window.__game?.getState());

test.describe('à la souris', () => {
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Souris : testé sur desktop et grand écran');
  });

  test('acheter un zèbre dans un enclos débite son prix', async ({ page }) => {
    await openGame(page, { scenario: 'first-enclosure' });
    await page.evaluate(() => window.__game?.setCamera('mid', { x: 22, y: 35 }));
    const money = (await state(page))?.money ?? 0;
    await page.getByRole('button', { name: 'Animaux' }).click();
    await page.getByRole('button', { name: /Zèbre/ }).click();
    const target = await screenOf(page, 23, 35);
    await page.mouse.click(target.x, target.y);
    const after = await state(page);
    expect(Object.values(after?.animals ?? {}).map((a) => a.species)).toEqual(['zebra']);
    expect(after?.money).toBe(money - 3_000);
  });

  test('un lion ne peut pas rejoindre des zèbres : message explicite', async ({ page }) => {
    await openGame(page, { scenario: 'four-species' });
    await page.evaluate(() => window.__game?.setCamera('mid', { x: 15, y: 33 }));
    await page.getByRole('button', { name: 'Animaux' }).click();
    await page.getByRole('button', { name: /Lion/ }).click();
    const target = await screenOf(page, 13, 32);
    await page.mouse.click(target.x, target.y);
    await expect(page.getByTestId('toast')).toContainText('le lion ne peut pas vivre avec les zèbres');
    const lions = Object.values((await state(page))?.animals ?? {}).filter((a) => a.species === 'lion');
    expect(lions).toHaveLength(2);
  });

  test('un clic sur un animal ouvre son panneau, Échap le ferme', async ({ page }) => {
    await openGame(page, { scenario: 'animal-needs' });
    await page.evaluate(() => window.__game?.setCamera('mid'));
    const lion = Object.values((await state(page))?.animals ?? {}).find((a) => a.species === 'lion');
    if (!lion) throw new Error('Lion absent du scénario');
    const target = await screenOf(page, lion.x - 0.5, lion.y - 0.5);
    await page.mouse.click(target.x, target.y);
    const panel = page.getByTestId('inspector');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText(/Lion n° \d+/);
    await expect(panel).toContainText('Malade');
    await expect(panel).toContainText('Pas de nourrisseur');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('un enclos sans eau et trop petit : le panneau dit pourquoi', async ({ page }) => {
    await openGame(page, { scenario: 'animal-needs' });
    const giraffe = Object.values((await state(page))?.animals ?? {}).find((a) => a.species === 'giraffe');
    if (!giraffe) throw new Error('Girafe absente du scénario');
    await page.evaluate((id) => window.__game?.inspect({ kind: 'enclosure', id }), giraffe.enclosureId);
    const panel = page.getByTestId('inspector');
    await expect(panel).toContainText('Pas d’eau');
    await expect(panel).toContainText('Enclos trop petit : 12 tuiles pour 40 nécessaires');
  });
});

test('au clavier : liste des enclos, enclos, animal, retour', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Clavier : testé sur desktop et grand écran');
  await openGame(page, { scenario: 'four-species' });
  await page.getByTestId('zoo-button').focus();
  await page.keyboard.press('Enter');
  const panel = page.getByTestId('inspector');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Enclos du zoo');
  await expect(panel.getByRole('heading', { level: 2 })).toBeFocused();

  // Tab : fermer, puis le premier enclos de la liste.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText(/Enclos n° \d+/);
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText(/Enclos n° \d+ · \d+ tuiles/);
  await expect(panel.getByRole('heading', { level: 2 })).toBeFocused();

  const firstAnimal = panel.locator('.animal-row').first();
  await firstAnimal.focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText(/(Zèbre|Girafe|Lion|Panda) n° \d+/);
  await expect(panel.getByRole('meter', { name: 'Nourriture' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir l’enclos' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText(/Enclos n° \d+/);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('vitesse : boutons et raccourcis espace, 1, 2, 3', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Clavier : testé sur desktop et grand écran');
  await openGame(page);
  const speed4 = page.getByRole('button', { name: /Vitesse ×4/ });
  await page.keyboard.press('3');
  await expect(speed4).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press(' ');
  await expect(page.getByTestId('pause')).toHaveAttribute('aria-pressed', 'true');
  await expect(speed4).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /Vitesse ×2/ }).click();
  await expect(page.getByTestId('pause')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('clock')).toHaveText(/Jour 1, \d\d:\d0/);
});

test('au doigt : un appui bref sur un animal ouvre son panneau', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Tactile : testé sur mobile');
  await openGame(page, { scenario: 'animal-needs' });
  const panda = Object.values((await state(page))?.animals ?? {}).find((a) => a.species === 'panda');
  if (!panda) throw new Error('Panda absent du scénario');
  await page.evaluate((tile) => window.__game?.setCamera('mid', tile), {
    x: Math.floor(panda.x),
    y: Math.floor(panda.y),
  });
  const target = await screenOf(page, panda.x - 0.5, panda.y - 0.5);
  await page.touchscreen.tap(target.x, target.y);
  const panel = page.getByTestId('inspector');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText(/Panda n° \d+/);
  await expect(panel).toContainText('A faim');
});
