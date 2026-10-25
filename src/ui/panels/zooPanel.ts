import { speciesIcon } from '../../render/icons';
import { SPECIES_IDS } from '../../sim/data/species';
import { animalStatus } from '../../sim/entities';
import type { GameState } from '../../sim/state';
import { animalsIn } from '../../sim/world/habitat';
import { canvasImage, h } from '../dom';
import { t } from '../i18n';
import type { PanelContent, PanelNavigation } from './types';

// Liste des enclos : accès clavier aux panneaux sans viser le canvas.

export function zooPanel(state: Readonly<GameState>, nav: PanelNavigation): PanelContent {
  const enclosures = Object.values(state.enclosures);
  const rows = enclosures.map((enclosure) => {
    const animals = animalsIn(state, enclosure.id);
    const alerts = animals.filter(
      (a) => animalStatus(a) !== 'content' && animalStatus(a) !== 'sleeping',
    ).length;
    const species = SPECIES_IDS.filter((id) => animals.some((a) => a.species === id));
    return h('li', {}, [
      h(
        'button',
        {
          className: 'animal-row',
          attrs: { 'data-focus-id': `enclosure-${enclosure.id}` },
          onClick: () => nav.select({ kind: 'enclosure', id: enclosure.id }),
        },
        [
          h('span', {
            text: `${t('zoo.enclosure', { id: enclosure.id })} · ${t('panel.area', { area: enclosure.area })}`,
          }),
          ...species.map((id) => canvasImage(speciesIcon(id), 'inline-icon')),
          alerts > 0
            ? h('span', { className: 'alert-count', text: `! ${t('zoo.alerts', { count: alerts })}` })
            : null,
        ],
      ),
    ]);
  });
  return {
    title: t('zoo.title'),
    body: [rows.length > 0 ? h('ul', { className: 'animal-list' }, rows) : h('p', { text: t('zoo.empty') })],
  };
}
