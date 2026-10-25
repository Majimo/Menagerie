import { speciesIcon } from '../../render/icons';
import { SPECIES_IDS } from '../../sim/data/species';
import { animalStatus } from '../../sim/entities';
import type { Enclosure, GameState } from '../../sim/state';
import { animalsIn, habitatReport } from '../../sim/world/habitat';
import { visitorNetwork } from '../../sim/world/visitorNetwork';
import { canvasImage, h } from '../dom';
import { t } from '../i18n';
import { icon } from '../icons';
import type { PanelContent, PanelNavigation } from './types';
import { criteriaList, equipmentCounts, issueList, statusBadge } from './widgets';

// Panneau d'un enclos : équipement, score d'habitat détaillé par espèce, liste des animaux.

export function enclosurePanel(
  state: Readonly<GameState>,
  enclosure: Enclosure,
  nav: PanelNavigation,
): PanelContent {
  const animals = animalsIn(state, enclosure.id);
  const dead = Object.values(state.animals).filter((a) => a.enclosureId === enclosure.id && a.diedAt >= 0);
  const present = SPECIES_IDS.filter((id) => animals.some((a) => a.species === id));

  const habitats = present.flatMap((species) => {
    const report = habitatReport(state, enclosure.id, species);
    return [
      h('h3', { className: 'panel-species' }, [
        canvasImage(speciesIcon(species), 'inline-icon'),
        t('panel.habitat', { species: t(`species.${species}.of`), score: report.score }),
      ]),
      criteriaList(report),
      issueList(report, state, enclosure.id, species),
    ];
  });

  const list = [...animals, ...dead].map((animal) =>
    h('li', {}, [
      h(
        'button',
        {
          className: 'animal-row',
          attrs: { 'data-focus-id': `animal-${animal.id}` },
          onClick: () => nav.select({ kind: 'animal', id: animal.id }),
        },
        [
          canvasImage(speciesIcon(animal.species), 'inline-icon'),
          h('span', {
            text: t('panel.animalTitle', { species: t(`species.${animal.species}`), id: animal.id }),
          }),
          statusBadge(animalStatus(animal)),
        ],
      ),
    ]),
  );

  const unreachable = animals.length > 0 && !visitorNetwork(state).viewSpots.has(enclosure.id);
  const viewers = Object.values(state.visitors).filter(
    (v) => v.state === 'viewing' && v.targetEnclosure === enclosure.id,
  ).length;

  return {
    title: `${t('panel.enclosureTitle', { id: enclosure.id })} · ${t('panel.area', { area: enclosure.area })}`,
    body: [
      unreachable
        ? h('p', { className: 'panel-warning', attrs: { 'data-testid': 'unreachable' } }, [
            icon('alert'),
            t('panel.unreachable'),
          ])
        : h('p', { className: 'panel-note', text: t('panel.viewers', { count: viewers }) }),
      equipmentCounts(state, enclosure.id),
      ...habitats,
      h('h3', { text: t('panel.animals') }),
      list.length > 0 ? h('ul', { className: 'animal-list' }, list) : h('p', { text: t('panel.noAnimals') }),
    ],
  };
}
