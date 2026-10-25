import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { ITERATION, openGame, ZOOMS } from './helpers';
import type { ScenarioName } from './scenarios';

// Captures pour la revue visuelle : artifacts/screenshots/<iteration>/<scenario>_<viewport>_<zoom>.png.
// Ce ne sont pas des tests pixel à pixel : elles sont ouvertes et revues avec la grille de docs/09.

const SCENARIOS: ScenarioName[] = ['boot'];
const OUT_DIR = `artifacts/screenshots/${ITERATION}`;

for (const scenario of SCENARIOS) {
  test(`captures du scénario ${scenario} @shots`, async ({ page }, testInfo) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await openGame(page, { scenario });
    await page.evaluate(() => window.__game?.freezeTime());
    for (const zoom of ZOOMS) {
      await page.evaluate((preset) => window.__game?.setCamera(preset), zoom);
      // Deux frames : la caméra est appliquée puis rendue.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await page.screenshot({ path: `${OUT_DIR}/${scenario}_${testInfo.project.name}_${zoom}.png` });
    }
  });
}
