import { mkdirSync } from 'node:fs';
import { type Page, test } from '@playwright/test';
import { ITERATION, openGame, ZOOMS } from './helpers';
import type { ScenarioName } from './scenarios';

// Captures pour la revue visuelle : artifacts/screenshots/<iteration>/<scenario>_<viewport>_<zoom>.png.
// Ce ne sont pas des tests pixel à pixel : elles sont ouvertes et revues avec la grille de docs/09.

const SCENARIOS: ScenarioName[] = [
  'empty-map',
  'first-enclosure',
  'full-map',
  'four-species',
  'animal-needs',
  'busy-day',
  'snack-time',
  'crisis',
  'rest-stop',
  'bankrupt',
];
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

// Aperçu valide / invalide sous simulation de daltonisme : il doit rester lisible sans la couleur.
for (const deficiency of ['achromatopsia', 'deuteranopia'] as const) {
  test(`capture de l’aperçu sous ${deficiency} @shots`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Une seule taille suffit');
    mkdirSync(OUT_DIR, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: deficiency });
    await openGame(page, { scenario: 'first-enclosure' });
    await page.evaluate(() => {
      const game = window.__game;
      game?.freezeTime();
      game?.previewTool('path', { x: 13, y: 42 }, { x: 24, y: 42 });
      game?.setCamera('close');
    });
    await nextFrames(page);
    await page.screenshot({
      path: `${OUT_DIR}/first-enclosure-${deficiency}_${testInfo.project.name}_close.png`,
    });
  });
}

test('capture après un quart de tour de caméra @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Une seule taille suffit');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'first-enclosure' });
  await page.evaluate(() => window.__game?.freezeTime());
  await page.getByRole('button', { name: 'Tourner la vue à droite' }).click();
  await page.evaluate(() => {
    window.__game?.previewTool('path', { x: 13, y: 42 }, { x: 24, y: 42 });
    window.__game?.setCamera('mid');
  });
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/first-enclosure-rotated_${testInfo.project.name}_mid.png` });
});

// --- Itération 2 : animaux -------------------------------------------------------------------------------

/** Centre de chaque enclos du scénario four-species. */
const SPECIES_FOCUS = {
  zebra: { x: 15, y: 33 },
  giraffe: { x: 24, y: 33 },
  lion: { x: 33, y: 33 },
  panda: { x: 15, y: 24 },
} as const;

test('test de silhouette des 4 espèces @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Une seule taille suffit');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'four-species' });
  await page.evaluate(() => {
    window.__game?.freezeTime();
    window.__game?.silhouette(true);
  });
  for (const [species, focus] of Object.entries(SPECIES_FOCUS)) {
    await page.evaluate((tile) => window.__game?.setCamera('close', tile), focus);
    await nextFrames(page);
    await page.screenshot({ path: `${OUT_DIR}/silhouette-${species}_${testInfo.project.name}_close.png` });
  }
  await page.evaluate(() => window.__game?.setCamera('mid'));
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/silhouette-all_${testInfo.project.name}_mid.png` });
});

test('capture de nuit : animaux endormis @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'wide', 'Desktop et mobile suffisent');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'four-species' });
  await page.evaluate(() => {
    const game = window.__game;
    game?.freezeTime();
    // Scénario à 14 h ; 23 h = 9 heures plus tard, 50 ticks par heure.
    game?.advance(450);
    game?.setCamera('mid');
  });
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/four-species-night_${testInfo.project.name}_mid.png` });
});

for (const deficiency of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
  test(`états des animaux sous ${deficiency} @shots`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Une seule taille suffit');
    mkdirSync(OUT_DIR, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: deficiency });
    await openGame(page, { scenario: 'animal-needs' });
    await page.evaluate(() => {
      window.__game?.freezeTime();
      window.__game?.setCamera('mid');
    });
    await nextFrames(page);
    await page.screenshot({ path: `${OUT_DIR}/animal-needs-${deficiency}_${testInfo.project.name}_mid.png` });
  });
}

test('panneaux d’inspection d’un animal et d’un enclos @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'wide', 'Desktop et mobile suffisent');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'animal-needs' });
  const lion = await page.evaluate(() => {
    const game = window.__game;
    game?.freezeTime();
    game?.setCamera('mid');
    const found = Object.values(game?.getState().animals ?? {}).find((a) => a.species === 'lion');
    return found?.id ?? 0;
  });
  await page.evaluate((id) => window.__game?.inspect({ kind: 'animal', id }), lion);
  await page.getByTestId('inspector').waitFor();
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/panel-animal_${testInfo.project.name}_mid.png` });

  const enclosure = await page.evaluate(
    (id) => window.__game?.getState().animals[id]?.enclosureId ?? 0,
    lion,
  );
  await page.evaluate((id) => window.__game?.inspect({ kind: 'enclosure', id }), enclosure);
  await page.waitForTimeout(300);
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/panel-enclosure_${testInfo.project.name}_mid.png` });
});

// --- Itération 3 : visiteurs et économie ------------------------------------------------------------------

test('panneaux Économie et Visiteur @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'wide', 'Desktop et mobile suffisent');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'busy-day' });
  await page.evaluate(() => {
    window.__game?.freezeTime();
    window.__game?.setCamera('mid');
  });
  await page.getByTestId('economy-button').click();
  await page.getByTestId('inspector').waitFor();
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/panel-economy_${testInfo.project.name}_mid.png` });
  const visitor = await page.evaluate(() => {
    const found = Object.values(window.__game?.getState().visitors ?? {}).find(
      (v) => v.state === 'viewing' && v.kind === 'child',
    );
    return found ? { id: found.id, x: Math.floor(found.x), y: Math.floor(found.y) } : null;
  });
  if (!visitor) throw new Error('Aucun enfant en observation');
  await page.evaluate((v) => {
    window.__game?.inspect({ kind: 'visitor', id: v.id });
    window.__game?.setCamera('close', { x: v.x, y: v.y });
  }, visitor);
  await page.waitForTimeout(300);
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/panel-visitor_${testInfo.project.name}_close.png` });
});

test('crise : bilan de la veille en déficit @shots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'wide', 'Desktop et mobile suffisent');
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'crisis' });
  await page.evaluate(() => {
    window.__game?.freezeTime();
    window.__game?.setCamera('mid');
  });
  await page.getByTestId('economy-button').click();
  await page.getByTestId('inspector').waitFor();
  await page.getByTestId('inspector').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/panel-economy-crisis_${testInfo.project.name}_mid.png` });
});

for (const deficiency of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
  test(`foule et alertes sous ${deficiency} @shots`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Une seule taille suffit');
    mkdirSync(OUT_DIR, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: deficiency });
    for (const scenario of ['busy-day', 'crisis'] as const) {
      await openGame(page, { scenario });
      await page.evaluate(() => {
        window.__game?.freezeTime();
        window.__game?.setCamera('close');
      });
      await nextFrames(page);
      await page.screenshot({
        path: `${OUT_DIR}/${scenario}-${deficiency}_${testInfo.project.name}_close.png`,
      });
    }
  });
}

test('captures de l’écran titre, du tutoriel, des objectifs et du menu @shots', async ({
  page,
}, testInfo) => {
  mkdirSync(OUT_DIR, { recursive: true });
  const name = testInfo.project.name;
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined);
  await page.evaluate(() => window.__game?.ready());
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/title_${name}.png` });
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  await page.getByTestId('tutorial').waitFor();
  await page.keyboard.press(' ');
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/tutorial_${name}.png` });
  await page.getByTestId('objectives').click();
  await page.screenshot({ path: `${OUT_DIR}/objectives_${name}.png` });
  await page.getByTestId('menu-button').click();
  await page.getByRole('dialog', { name: 'Menu' }).waitFor();
  await page.screenshot({ path: `${OUT_DIR}/menu_${name}.png` });
});

test('captures à l’échelle d’interface 150 % @shots', async ({ page }, testInfo) => {
  mkdirSync(OUT_DIR, { recursive: true });
  await openGame(page, { scenario: 'crisis' });
  await page.evaluate(() => {
    window.__game?.freezeTime();
    window.__game?.advance(1200);
    document.documentElement.style.setProperty('--ui-scale', '1.5');
  });
  await page.getByRole('button', { name: 'Biome' }).click();
  await nextFrames(page);
  await page.screenshot({ path: `${OUT_DIR}/ui-scale-150_${testInfo.project.name}.png` });
});
