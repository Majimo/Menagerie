import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { openGame } from './helpers';

// Accessibilité du DOM (docs/09) : zéro violation serious/critical, zones tactiles ≥ 44 px.

const MIN_TOUCH_TARGET = 44;

async function blockingViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

test('aucune violation axe serious ou critical', async ({ page }) => {
  await openGame(page, { scenario: 'first-enclosure' });
  expect(await blockingViolations(page)).toEqual([]);
});

test('aucune violation axe avec un outil actif, le choix du biome et un message affichés', async ({
  page,
}) => {
  await openGame(page, { scenario: 'first-enclosure' });
  await page.getByRole('button', { name: 'Biome' }).click();
  await expect(page.getByRole('group', { name: 'Biome à peindre' })).toBeVisible();
  await page.evaluate(() => window.__game?.setCamera('mid', { x: 21, y: 45 }));
  const point = await page.evaluate(() => window.__game?.tileToScreen({ x: 21, y: 47 }));
  if (!point) throw new Error('Position écran indisponible');
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole('status')).not.toBeEmpty();
  expect(await blockingViolations(page)).toEqual([]);
});

test('les boutons à icône ont un nom accessible et une bulle d’aide', async ({ page }) => {
  await openGame(page);
  const iconButtons = page.locator('#ui button:has(svg.icon)');
  expect(await iconButtons.count()).toBeGreaterThan(0);
  for (const button of await iconButtons.all()) {
    // Nom accessible : `aria-label`, ou le texte du bouton (éventuellement masqué visuellement).
    const name = (await button.getAttribute('aria-label')) ?? (await button.textContent())?.trim();
    expect(name).toBeTruthy();
    expect(await button.getAttribute('title')).toBeTruthy();
  }
});

test('la page a une langue, un titre et une scène étiquetée', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveTitle(/Ménagerie/);
  await expect(page.getByRole('img', { name: 'Vue isométrique du zoo' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('les contrôles interactifs font au moins 44 × 44 px', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Biome' }).click(); // affiche aussi le choix du biome
  const controls = page.locator('button, a[href], input, select, textarea, [role="button"], [tabindex="0"]');
  const tooSmall: string[] = [];
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box && (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET)) {
      tooSmall.push(
        `${await control.evaluate((el) => el.outerHTML.slice(0, 80))} (${box.width}×${box.height})`,
      );
    }
  }
  expect(tooSmall).toEqual([]);
});

test('aucune violation axe avec les panneaux d’inspection et le choix de l’espèce', async ({ page }) => {
  await openGame(page, { scenario: 'animal-needs' });
  await page.getByRole('button', { name: 'Animaux' }).click();
  await expect(page.getByRole('group', { name: 'Espèce à placer' })).toBeVisible();
  const lion = await page.evaluate(
    () => Object.values(window.__game?.getState().animals ?? {}).find((a) => a.species === 'lion')?.id ?? 0,
  );
  await page.evaluate((id) => window.__game?.inspect({ kind: 'animal', id }), lion);
  await expect(page.getByTestId('inspector')).toBeVisible();
  expect(await blockingViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Voir l’enclos' }).click();
  await expect(page.getByTestId('inspector')).toContainText('Animaux');
  expect(await blockingViolations(page)).toEqual([]);
  await page.evaluate(() => window.__game?.inspect({ kind: 'zoo' }));
  await expect(page.getByTestId('inspector')).toContainText('Enclos du zoo');
  expect(await blockingViolations(page)).toEqual([]);
});

test('les contrôles des panneaux font au moins 44 × 44 px', async ({ page }) => {
  await openGame(page, { scenario: 'animal-needs' });
  await page.getByRole('button', { name: 'Objets' }).click();
  await page.evaluate(() => window.__game?.inspect({ kind: 'zoo' }));
  await expect(page.getByTestId('inspector')).toBeVisible();
  const controls = page.locator('#ui button');
  const tooSmall: string[] = [];
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box && (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET)) {
      tooSmall.push(
        `${await control.evaluate((el) => el.outerHTML.slice(0, 80))} (${box.width}×${box.height})`,
      );
    }
  }
  expect(tooSmall).toEqual([]);
});

test('aucune violation axe avec les alertes de crise et les panneaux Économie et Visiteur', async ({
  page,
}) => {
  await openGame(page, { scenario: 'crisis' });
  await expect(page.getByTestId('alerts')).toContainText('bloqué');
  expect(await blockingViolations(page)).toEqual([]);
  await page.getByTestId('economy-button').click();
  await expect(page.getByTestId('inspector')).toContainText('Économie du zoo');
  expect(await blockingViolations(page)).toEqual([]);
  const visitor = await page.evaluate(
    () => Object.values(window.__game?.getState().visitors ?? {})[0]?.id ?? 0,
  );
  await page.evaluate((id) => window.__game?.inspect({ kind: 'visitor', id }), visitor);
  await expect(page.getByTestId('inspector')).toContainText(/Adulte|Enfant/);
  expect(await blockingViolations(page)).toEqual([]);
});

test('alertes et réglage du prix : contrôles d’au moins 44 × 44 px', async ({ page }) => {
  await openGame(page, { scenario: 'crisis' });
  await page.getByTestId('economy-button').click();
  await expect(page.getByTestId('inspector')).toContainText('Économie du zoo');
  const controls = page.locator('#ui button');
  const tooSmall: string[] = [];
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box && (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET)) {
      tooSmall.push(
        `${await control.evaluate((el) => el.outerHTML.slice(0, 80))} (${box.width}×${box.height})`,
      );
    }
  }
  expect(tooSmall).toEqual([]);
});

/** Contrôles visibles de moins de 44 × 44 px dans `scope`. */
async function smallControls(page: Page, scope = 'body'): Promise<string[]> {
  const controls = page.locator(`${scope} :is(button, a[href], input, select, textarea, [role="button"])`);
  const tooSmall: string[] = [];
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box && (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET)) {
      tooSmall.push(
        `${await control.evaluate((el) => el.outerHTML.slice(0, 80))} (${box.width}×${box.height})`,
      );
    }
  }
  return tooSmall;
}

async function openTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined);
  await page.evaluate(() => window.__game?.ready());
}

test('itération 4 : écran titre, tutoriel, objectifs et menu sans violation axe, contrôles ≥ 44 px', async ({
  page,
}) => {
  await openTitle(page);
  await expect(page.getByRole('dialog', { name: 'Ménagerie' })).toBeVisible();
  expect(await blockingViolations(page)).toEqual([]);
  expect(await smallControls(page, 'dialog[open]')).toEqual([]);

  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  await expect(page.getByTestId('tutorial')).toBeVisible();
  await page.getByTestId('objectives').click();
  await expect(page.locator('#objectives-list')).toBeVisible();
  expect(await blockingViolations(page)).toEqual([]);
  expect(await smallControls(page, '#ui')).toEqual([]);

  await page.getByTestId('menu-button').click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  expect(await blockingViolations(page)).toEqual([]);
  expect(await smallControls(page, 'dialog[open]')).toEqual([]);
  // Échap ferme le menu et la partie reprend.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
});

test('itération 4 : écran de fin et alerte de faillite sans violation axe', async ({ page }) => {
  await openGame(page, { scenario: 'bankrupt' });
  await expect(page.getByRole('dialog', { name: 'Faillite' })).toBeVisible();
  expect(await blockingViolations(page)).toEqual([]);
  expect(await smallControls(page, 'dialog[open]')).toEqual([]);
  await openGame(page, { scenario: 'crisis' });
  await page.evaluate(() => window.__game?.advance(1200));
  await expect(page.getByTestId('alerts')).toContainText('Faillite');
  // La variation d'argent s'efface en fondu : axe mesurerait un contraste de transition.
  await expect(page.locator('.money-delta.visible')).toHaveCount(0);
  expect(await blockingViolations(page)).toEqual([]);
});

test('échelle d’interface 150 % : rien ne sort de l’écran, rien ne se chevauche', async ({ page }) => {
  await openGame(page, { scenario: 'crisis' });
  await page.evaluate(() => document.documentElement.style.setProperty('--ui-scale', '1.5'));
  await page.getByRole('button', { name: 'Biome' }).click();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport inconnu');
  const selectors = [
    '.money',
    '.menu-button',
    '.time-controls',
    '.hud-left',
    '.toolbar',
    '.picker',
    '.camera-controls',
  ];
  const boxes: { name: string; x: number; y: number; width: number; height: number }[] = [];
  for (const name of selectors) {
    const el = page.locator(name).first();
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    boxes.push({ name, ...box });
    expect(box.x, `${name} déborde à gauche`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${name} déborde à droite`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y + box.height, `${name} déborde en bas`).toBeLessThanOrEqual(viewport.height + 0.5);
  }
  const overlaps: string[] = [];
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const apart =
        a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      if (!apart) overlaps.push(`${a.name} / ${b.name}`);
    }
  }
  expect(overlaps).toEqual([]);
});
