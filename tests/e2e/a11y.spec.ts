import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openGame } from './helpers';

// Accessibilité du DOM (docs/09) : zéro violation serious/critical, zones tactiles ≥ 44 px.

const MIN_TOUCH_TARGET = 44;

test('aucune violation axe serious ou critical', async ({ page }) => {
  await openGame(page);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id} : ${v.help}`)).toEqual([]);
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
