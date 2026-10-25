import { balance } from './data/balance';

// Accumulateur de temps réel → ticks fixes de 100 ms (règle d'architecture n° 6).
// Le temps réel est fourni par l'appelant : la simulation ne lit jamais l'horloge.

export interface Clock {
  accumulatorMs: number;
}

export function createClock(): Clock {
  return { accumulatorMs: 0 };
}

/** Nombre de ticks à exécuter pour `realDeltaMs` écoulées à la vitesse `speed` (0 = pause). */
export function ticksDue(clock: Clock, realDeltaMs: number, speed: number): number {
  const { tickMs, maxTicksPerFrame } = balance.time;
  clock.accumulatorMs += Math.max(0, realDeltaMs) * speed;
  const due = Math.floor(clock.accumulatorMs / tickMs);
  if (due > maxTicksPerFrame) {
    // Retard trop grand (onglet en veille) : on abandonne le retard plutôt que d'enchaîner les ticks.
    clock.accumulatorMs = 0;
    return maxTicksPerFrame;
  }
  clock.accumulatorMs -= due * tickMs;
  return due;
}

/** Fraction du tick suivant déjà écoulée, dans [0, 1) : sert à l'interpolation au rendu. */
export function tickFraction(clock: Readonly<Clock>): number {
  return clock.accumulatorMs / balance.time.tickMs;
}
