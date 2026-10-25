import { mkdirSync } from 'node:fs';
import { type Page, test } from '@playwright/test';
import { ITERATION, openGame, ZOOMS } from './helpers';
import type { ScenarioName } from './scenarios';

// Captures pour la revue visuelle : artifacts/screenshots/<iteration>/<scenario>_<viewport>_<zoom>.png.
// Ce ne sont pas des tests pixel à pixel : elles sont ouvertes et revues avec la grille de docs/09.

const SCENARIOS: ScenarioName[] = ['empty-map', 'first-enclosure'];
const OUT_DIR = `artifacts/screenshots/${ITERATION}`;

async function nextFrames(page: Page): Promise<void> {
  // Deux frames : l'état est appliqué puis rendu.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

for (const scenario of SCENARIOS) {
  test(`captures du scénario ${scenario} @shots`, async ({ page }, testInfo) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await openGame(page, { scenario });
    await page.evaluate(() => window.__game?.freezeTime());
    if (scenario === 'first-enclosure') {
      // Aperçu d'un chemin qui croise un chemin existant : tuiles valides (✓) et invalides (✗) côte à côte.
      await page.evaluate(() => window.__game?.previewTool('path', { x: 13, y: 42 }, { x: 24, y: 42 }));
    }
    for (const zoom of ZOOMS) {
      await page.evaluate((preset) => window.__game?.setCamera(preset), zoom);
      await nextFrames(page);
      await page.screenshot({ path: `${OUT_DIR}/${scenario}_${testInfo.project.name}_${zoom}.png` });
    }
  });
}

test('capture d’un aperçu de clôture qui chevauche une clôture existante @shots', async ({
  page,
}, testInfo) => {
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'first-enclosure' });
  await page.evaluate(() => {
    const game = window.__game;
    game?.freezeTime();
    // Coins (27, 30) → (33, 36) : le côté ouest longe en partie la clôture est de l'enclos.
    game?.previewTool('fence', { x: 27, y: 30 }, { x: 33, y: 36 });
    game?.setCamera('mid', { x: 29, y: 34 });
  });
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/fence-preview_${testInfo.project.name}_mid.png` });
});
