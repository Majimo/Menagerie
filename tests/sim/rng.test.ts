import { describe, expect, it } from 'vitest';
import { nextFloat, nextInt } from '../../src/sim/rng';

describe('PRNG seedé', () => {
  it('même seed, même suite', () => {
    const a = { rngState: 42 };
    const b = { rngState: 42 };
    const seqA = Array.from({ length: 100 }, () => nextFloat(a));
    const seqB = Array.from({ length: 100 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
  });

  it('seeds différentes, suites différentes', () => {
    const a = { rngState: 1 };
    const b = { rngState: 2 };
    expect(nextFloat(a)).not.toBe(nextFloat(b));
  });

  it('reprend exactement là où il s’est arrêté (état sérialisable)', () => {
    const a = { rngState: 7 };
    for (let i = 0; i < 10; i++) nextFloat(a);
    const resumed = JSON.parse(JSON.stringify(a)) as { rngState: number };
    expect(nextFloat(resumed)).toBe(nextFloat(a));
  });

  it('reste dans les bornes et couvre l’intervalle', () => {
    const holder = { rngState: 3 };
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = nextFloat(holder);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      seen.add(nextInt(holder, 0, 6));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
