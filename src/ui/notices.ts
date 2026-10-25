import { deathCause } from '../sim/entities';
import type { AnimalId, GameState } from '../sim/state';
import type { Toast } from './feedback';
import { t } from './i18n';

// Annonces des événements graves (mort d'un animal), lues par les lecteurs d'écran via le message `aria-live`.

export interface Notices {
  update(state: Readonly<GameState>): void;
}

export function createNotices(toast: Toast): Notices {
  let announced = new Set<AnimalId>();
  let lastState: Readonly<GameState> | null = null;
  return {
    update(state) {
      if (state !== lastState) {
        // Nouvelle partie ou scénario : les morts déjà présentes ne sont pas des nouvelles.
        announced = new Set(
          Object.values(state.animals)
            .filter((a) => a.diedAt >= 0)
            .map((a) => a.id),
        );
        lastState = state;
        return;
      }
      for (const animal of Object.values(state.animals)) {
        if (animal.diedAt < 0 || announced.has(animal.id)) continue;
        announced.add(animal.id);
        toast.show(
          t('notice.death', {
            species: t(`species.${animal.species}`),
            id: animal.id,
            cause: t(`cause.${deathCause(animal)}`),
          }),
          'info',
        );
      }
    },
  };
}
