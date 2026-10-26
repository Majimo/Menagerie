import { expect, test } from '@playwright/test';
import { openGame } from './helpers';
import type { ScenarioName } from './scenarios';

// Régression visuelle (docs/09) sur les scénarios stables : temps figé, vue éloignée, interface comprise.
// Le rendu WebGL logiciel varie d'une machine à l'autre : les références sont propres à la machine qui les a
// produites (`npx playwright test regression --update-snapshots` pour les régénérer après un changement voulu).

const STABLE: ScenarioName[] = ['empty-map', 'first-enclosure', 'four-species', 'busy-day', 'bankrupt'];

for (const scenario of STABLE) {
  test(`régression visuelle : ${scenario}`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Une seule taille d’écran suffit à détecter une régression',
    );
    await openGame(page, { scenario });
    await page.evaluate(() => {
      window.__game?.freezeTime();
      window.__game?.setCamera('far');
    });
    await expect(page).toHaveScreenshot(`${scenario}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
