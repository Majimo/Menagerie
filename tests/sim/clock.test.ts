import { describe, expect, it } from 'vitest';
import { createClock, tickFraction, ticksDue } from '../../src/sim/clock';
import { balance } from '../../src/sim/data/balance';

describe('horloge à tick fixe', () => {
  it('10 ticks par seconde réelle à ×1, 20 à ×2, 0 en pause', () => {
    for (const [speed, expected] of [
      [1, 10],
      [2, 20],
      [0, 0],
    ] as const) {
      const clock = createClock();
      let ticks = 0;
      for (let frame = 0; frame < 60; frame++) ticks += ticksDue(clock, 1000 / 60, speed);
      expect(ticks).toBe(expected);
    }
  });

  it('garde le reste pour l’interpolation', () => {
    const clock = createClock();
    expect(ticksDue(clock, 150, 1)).toBe(1);
    expect(tickFraction(clock)).toBeCloseTo(0.5);
  });

  it('plafonne le rattrapage après une longue pause de l’onglet', () => {
    const clock = createClock();
    expect(ticksDue(clock, 60_000, 1)).toBe(balance.time.maxTicksPerFrame);
    expect(clock.accumulatorMs).toBe(0);
  });
});
