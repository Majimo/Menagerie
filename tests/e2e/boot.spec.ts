import { expect, test } from '@playwright/test';
import { countColors, openGame } from './helpers';

test('le canvas occupe tout l’écran et affiche une scène', async ({ page }) => {
  await openGame(page);
  const canvas = page.locator('#scene');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);

  // Un canvas vide ou sans WebGL ne contient qu'une ou deux couleurs.
  expect(await countColors(page, await canvas.screenshot())).toBeGreaterThan(20);
});

test('l’API de debug avance la simulation', async ({ page }) => {
  await openGame(page);
  const tick = await page.evaluate(() => {
    window.__game?.advance(25);
    return window.__game?.getState().tick;
  });
  expect(tick).toBe(25);
});

test('le compteur de FPS s’affiche avec ?debug, et seulement avec ?debug', async ({ page }) => {
  await openGame(page);
  await expect(page.getByTestId('debug-overlay')).toHaveCount(0);
  await openGame(page, { debugOverlay: true });
  await expect(page.getByTestId('debug-overlay')).toContainText(/FPS \d+/);
});

test('aucune erreur ni avertissement dans la console au démarrage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Les « GL Driver Message » viennent du rendu logiciel SwiftShader en headless, pas du jeu.
    const fromDriver = message.text().includes('GL Driver Message');
    if ((message.type() === 'error' || message.type() === 'warning') && !fromDriver)
      errors.push(message.text());
  });
  await openGame(page);
  expect(errors).toEqual([]);
});
