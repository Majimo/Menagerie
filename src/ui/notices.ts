import { deathCause } from '../sim/entities';
import type { AnimalId, GameState } from '../sim/state';
import { ledgerNet } from '../sim/systems/economy';
import { daysBeforeBankruptcy } from '../sim/systems/objectives';
import type { Toast } from './feedback';
import { formatSigned, t } from './i18n';

// Annonces des événements de la partie (mort d'un animal, bilan de fin de journée, faillite proche), lues par les
// lecteurs d'écran via le message `aria-live`.

export interface Notices {
  update(state: Readonly<GameState>): void;
}

export function createNotices(toast: Toast): Notices {
  let announced = new Set<AnimalId>();
  let lastState: Readonly<GameState> | null = null;
  let lastDay = 0;
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
        lastDay = state.stats.today.day;
        return;
      }
      if (state.stats.today.day !== lastDay) {
        lastDay = state.stats.today.day;
        const ended = state.stats.history[state.stats.history.length - 1];
        const bankruptcy = state.scenario.debtDays > 0 ? daysBeforeBankruptcy(state) : null;
        if (ended)
          toast.show(
            [
              t('notice.dayEnd', {
                day: ended.day,
                net: formatSigned(ledgerNet(ended)),
                count: ended.visitors,
              }),
              bankruptcy !== null && bankruptcy > 0 ? t('notice.bankruptcy', { days: bankruptcy }) : '',
            ].join(' '),
            'info',
          );
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
