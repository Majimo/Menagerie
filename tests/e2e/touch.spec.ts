import { expect, test } from '@playwright/test';
import { openGame } from './helpers';

// Mobile : un appui court avec un outil actif construit, comme un clic.

test('poser un chemin au doigt', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Tactile : testé sur le projet mobile');
  await openGame(page, { scenario: 'empty-map' });
  await page.evaluate(() => window.__game?.setCamera('mid', { x: 12, y: 12 }));
  await page.getByRole('button', { name: 'Chemin' }).tap();
  const target = await page.evaluate(() => window.__game?.tileToScreen({ x: 12, y: 12 }));
  if (!target) throw new Error('Position écran indisponible');
  await page.touchscreen.tap(target.x, target.y);
  await expect.poll(async () => (await page.evaluate(() => window.__game?.getState()))?.money).toBe(49_995);
});
