import { FIRST_STEPS, type ObjectiveCondition } from '../data/scenario';
import type { GameState } from '../state';

// Système `objectives` : objectifs successifs du scénario « Premiers pas » et faillite (docs/02).
// Exécuté après `economy` : la fin de journée (dépenses de minuit) est déjà comptée quand on vérifie l'argent.

/** Espèces différentes vivantes dans le zoo. */
export function livingSpeciesCount(state: Readonly<GameState>): number {
  const species = new Set<string>();
  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt < 0) species.add(animal.species);
  }
  return species.size;
}

/** Valeur actuelle mesurée par une condition (pour l'affichage de la progression). */
export function conditionValue(state: Readonly<GameState>, condition: ObjectiveCondition): number {
  switch (condition.kind) {
    case 'species':
      return livingSpeciesCount(state);
    case 'visitorsInDay':
      return state.stats.today.visitors;
    case 'rating':
      return state.stats.rating;
  }
}

/** Indice du premier objectif non atteint, ou -1 si tous le sont (bac à sable). */
export function currentObjective(state: Readonly<GameState>): number {
  return state.scenario.completedAt.indexOf(-1);
}

/** Jours d'argent négatif restants avant la faillite, ou `null` si l'argent n'est pas en danger (ou trop tard). */
export function daysBeforeBankruptcy(state: Readonly<GameState>): number | null {
  if (state.scenario.outcome !== 'playing') return null;
  if (state.scenario.debtDays === 0 && state.money >= 0) return null;
  return FIRST_STEPS.bankruptcyDays - state.scenario.debtDays;
}

export function updateObjectives(state: GameState): void {
  const { scenario } = state;
  if (scenario.outcome !== 'playing') return;
  countDayEnd(state);
  if (state.tick % FIRST_STEPS.checkEveryTicks !== 0) return;
  // Un seul objectif à la fois : les suivants peuvent être validés dans la foulée aux vérifications suivantes.
  const index = currentObjective(state);
  const objective = FIRST_STEPS.objectives[index];
  if (!objective) return;
  if (objective.conditions.every((c) => conditionValue(state, c) >= c.min)) {
    scenario.completedAt[index] = state.tick;
  }
}

/** Une journée vient de se terminer : compte les jours consécutifs dans le rouge. */
function countDayEnd(state: GameState): void {
  const { scenario } = state;
  const ended = state.stats.history[state.stats.history.length - 1];
  if (!ended || ended.day <= scenario.lastDayChecked) return;
  scenario.lastDayChecked = ended.day;
  scenario.debtDays = state.money < 0 ? scenario.debtDays + 1 : 0;
  if (scenario.debtDays >= FIRST_STEPS.bankruptcyDays) scenario.outcome = 'lost';
}
