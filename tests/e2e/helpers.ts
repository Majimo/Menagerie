import type { Page } from '@playwright/test';
import type { ScenarioName } from './scenarios';
import '../../src/debug/gameApi';

// Utilitaires partagés par les specs Playwright.

/** Itération courante : dossier de sortie des captures. Surcharge possible par `ITERATION=…`. */
export const ITERATION = process.env.ITERATION ?? '4';

export const ZOOMS = ['far', 'mid', 'close'] as const;

interface OpenOptions {
  scenario?: ScenarioName;
  /** Affiche le compteur de FPS (`?debug`). Désactivé pour les captures : ce n'est pas l'interface du joueur. */
  debugOverlay?: boolean;
}

/** Ouvre le jeu, attend l'API de debug et la première frame, charge le scénario demandé. */
export async function openGame(
  page: Page,
  { scenario = 'boot', debugOverlay = false }: OpenOptions = {},
): Promise<void> {
  await page.goto(debugOverlay ? '/?debug' : '/');
  await page.waitForFunction(() => window.__game !== undefined);
  await page.evaluate(async (name) => {
    const game = window.__game;
    if (!game) throw new Error('window.__game absent');
    await game.ready();
    game.loadScenario(name);
  }, scenario);
}

/** Nombre de couleurs distinctes d'une image PNG (décodée dans la page) : détecte un canvas vide. */
export async function countColors(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexte 2D indisponible');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < data.length; i += 4) {
      colors.add(((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0));
    }
    return colors.size;
  }, png.toString('base64'));
}
