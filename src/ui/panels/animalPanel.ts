import { speciesIcon } from '../../render/icons';
import { balance } from '../../sim/data/balance';
import { animalStatus, deathCause } from '../../sim/entities';
import type { Animal, GameState } from '../../sim/state';
import { habitatReport } from '../../sim/world/habitat';
import { canvasImage, h } from '../dom';
import { t } from '../i18n';
import type { PanelContent, PanelNavigation } from './types';
import { gauge, issueList, statusBadge } from './widgets';

// Panneau d'un animal : état, jauges, habitat et ce qui ne va pas.

export function animalPanel(state: Readonly<GameState>, animal: Animal, nav: PanelNavigation): PanelContent {
  const { hungryBelow, thirstyBelow, unhappyBelow, startHealth } = balance.animals;
  const status = animalStatus(animal);
  const report = habitatReport(state, animal.enclosureId, animal.species);
  const title = t('panel.animalTitle', { species: t(`species.${animal.species}`), id: animal.id });
  const dead = animal.diedAt >= 0;

  const body = [
    h('p', { className: 'panel-status' }, [
      statusBadge(status),
      h('span', { className: 'panel-activity', text: `· ${t(`activity.${animal.activity}`)}` }),
    ]),
    dead
      ? h('p', {
          className: 'panel-dead',
          text: t('panel.diedOf', { cause: t(`cause.${deathCause(animal)}`) }),
        })
      : null,
    h('div', { className: 'gauges' }, [
      gauge('gauge.hunger', animal.hunger, hungryBelow),
      gauge('gauge.thirst', animal.thirst, thirstyBelow),
      gauge('gauge.wellbeing', animal.wellbeing, unhappyBelow),
      gauge('gauge.health', animal.health, startHealth),
    ]),
    h('h3', { text: t('panel.habitatShort', { score: report.score }) }),
    dead
      ? null
      : h('p', { className: 'panel-note', text: t('panel.target', { target: Math.round(report.target) }) }),
    issueList(report, state, animal.enclosureId, animal.species),
    animal.enclosureId
      ? h('button', {
          className: 'panel-link',
          text: t('panel.back'),
          attrs: { 'data-focus-id': 'back' },
          onClick: () => nav.select({ kind: 'enclosure', id: animal.enclosureId }),
        })
      : null,
  ];
  return { title, icon: canvasImage(speciesIcon(animal.species), 'panel-title-icon'), body };
}
