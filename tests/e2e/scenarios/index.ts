import type { Command } from '../../../src/sim/commands';

// Scénarios seedés de référence pour les captures (docs/09) : une seed, des commandes, un nombre de ticks.

export interface Scenario {
  seed: number;
  commands: Command[];
  ticks: number;
}

export const scenarios = {
  /** Itération 0 : la scène de démarrage (sol et cube de test). */
  boot: { seed: 1, commands: [], ticks: 0 },
} satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof scenarios;
