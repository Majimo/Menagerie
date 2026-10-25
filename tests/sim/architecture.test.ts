import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Garde d'architecture (règles n° 1 et 3 de CLAUDE.md) : src/sim/ reste du TypeScript pur et déterministe.
// Complète Biome (noRestrictedImports / noRestrictedGlobals) et tsconfig.sim.json (compilé sans lib DOM).

const SIM_DIR = join(import.meta.dirname, '../../src/sim');

const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /from\s+['"]three(\/[^'"]*)?['"]|import\(\s*['"]three/, reason: 'import de three' },
  {
    pattern: /from\s+['"][^'"]*\/(render|ui|input)(\/[^'"]*)?['"]/,
    reason: 'import du rendu, de l’UI ou des entrées',
  },
  { pattern: /\b(window|document|navigator|localStorage|requestAnimationFrame)\b/, reason: 'accès au DOM' },
  { pattern: /\bMath\.random\s*\(/, reason: 'Math.random() (utiliser sim/rng.ts)' },
  {
    pattern: /\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bperformance\.now\s*\(/,
    reason: 'horloge réelle (utiliser le compteur de ticks)',
  },
];

/** Retire les commentaires, pour que la documentation puisse citer les interdits. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
}

function findViolations(source: string): string[] {
  const code = stripComments(source);
  return FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ reason }) => reason);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(ts|js|mts)$/.test(entry.name) ? [path] : [];
  });
}

describe('garde d’architecture de src/sim/', () => {
  it('détecte bien chaque interdit (le garde n’est pas vide)', () => {
    expect(findViolations("import * as THREE from 'three';")).toHaveLength(1);
    expect(findViolations("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';")).toHaveLength(
      1,
    );
    expect(findViolations("import { draw } from '../render/renderer';")).toHaveLength(1);
    expect(findViolations('const w = window.innerWidth;')).toHaveLength(1);
    expect(findViolations('document.body.append(x);')).toHaveLength(1);
    expect(findViolations('const r = Math.random();')).toHaveLength(1);
    expect(findViolations('const t = Date.now();')).toHaveLength(1);
    expect(findViolations('// pas de Math.random() ici')).toHaveLength(0);
  });

  it('aucun fichier de src/sim/ ne viole les règles', () => {
    const files = listSourceFiles(SIM_DIR);
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((file) =>
      findViolations(readFileSync(file, 'utf8')).map((reason) => `${relative(SIM_DIR, file)} : ${reason}`),
    );
    expect(violations).toEqual([]);
  });
});
