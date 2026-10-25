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
    expect(await button.getAttribute('aria-label')).toBeTruthy();
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
