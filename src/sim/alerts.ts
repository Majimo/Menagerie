import { balance } from './data/balance';
import { isVisitorBlocked } from './entities/visitors';
import type { EnclosureId, GameState } from './state';
import { ledgerNet } from './systems/economy';
import { daysBeforeBankruptcy } from './systems/objectives';
import { visitorNetwork } from './world/visitorNetwork';

// Problèmes à signaler au joueur, calculés à partir de l'état (pas stockés).

export interface ZooAlerts {
  /** Enclos peuplés qu'aucun chemin relié à l'entrée ne longe : les visiteurs n'y vont pas. */
  unreachableEnclosures: EnclosureId[];
  /** Des animaux sont visibles mais la sortie n'est pas reliée à l'entrée : personne ne vient. */
  exitUnreachable: boolean;
  /** Visiteurs qui ne peuvent plus rejoindre la sortie. */
  blockedVisitors: number;
  /** Visiteurs affamés sans stand de snacks accessible. */
  hungryWithoutFood: number;
  /** Argent négatif, ou bilan d'hier négatif. */
  deficit: boolean;
  /** Jours de rouge restants avant la faillite, `null` si l'argent n'est pas en danger. */
  bankruptcyIn: number | null;
}

export function zooAlerts(state: Readonly<GameState>): ZooAlerts {
  const network = visitorNetwork(state);
  const populated = new Set<EnclosureId>();
  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt < 0 && animal.enclosureId !== 0) populated.add(animal.enclosureId);
  }
  const unreachableEnclosures = [...populated]
    .filter((id) => !network.viewSpots.has(id))
    .sort((a, b) => a - b);
  let blockedVisitors = 0;
  let hungryWithoutFood = 0;
  for (const visitor of Object.values(state.visitors)) {
    if (isVisitorBlocked(state, visitor)) blockedVisitors++;
    if (network.snackSpots.length === 0 && visitor.hunger < balance.visitors.hungryBelow) hungryWithoutFood++;
  }
  const yesterday = state.stats.history[state.stats.history.length - 1];
  return {
    unreachableEnclosures,
    exitUnreachable: populated.size > unreachableEnclosures.length && !network.exitReachable,
    blockedVisitors,
    hungryWithoutFood,
    deficit: state.money < 0 || (yesterday !== undefined && ledgerNet(yesterday) < 0),
    bankruptcyIn: daysBeforeBankruptcy(state),
  };
}
