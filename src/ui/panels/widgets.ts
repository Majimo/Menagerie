import { statusIcon } from '../../render/icons';
import { balance } from '../../sim/data/balance';
import { BUILDINGS } from '../../sim/data/buildings';
import { SPECIES, type SpeciesId } from '../../sim/data/species';
import { tileCode } from '../../sim/data/terrain';
import type { AnimalStatus } from '../../sim/entities';
import type { EnclosureId, GameState } from '../../sim/state';
import { animalsIn, type HabitatIssue, type HabitatReport } from '../../sim/world/habitat';
import { canvasImage, h } from '../dom';
import { type TextKey, t } from '../i18n';

// Éléments communs des panneaux : jauges, état, liste des problèmes d'habitat.

/** Jauge 0–100 : barre, valeur en chiffres et mention « bas » sous le seuil (jamais la couleur seule). */
export function gauge(labelKey: TextKey, value: number, lowBelow: number): HTMLElement {
  const rounded = Math.round(value);
  const low = rounded < lowBelow;
  const label = t(labelKey);
  const fill = h('span', { className: 'gauge-fill', attrs: { style: `width: ${rounded}%` } });
  return h(
    'div',
    {
      className: 'gauge',
      attrs: {
        role: 'meter',
        'aria-label': label,
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(rounded),
        'aria-valuetext': low ? `${rounded} / 100, ${t('panel.low')}` : `${rounded} / 100`,
        'data-low': String(low),
      },
    },
    [
      h('span', { className: 'gauge-label', text: label }),
      h('span', { className: 'gauge-track', attrs: { 'aria-hidden': 'true' } }, [fill]),
      h('span', { className: 'gauge-value', attrs: { 'aria-hidden': 'true' } }, [
        low ? h('span', { className: 'gauge-low', text: `▼ ${t('panel.low')}` }) : null,
        String(rounded),
      ]),
    ],
  );
}

export function statusBadge(status: AnimalStatus): HTMLElement {
  return h('span', { className: 'status-badge', attrs: { 'data-status': status } }, [
    status === 'content'
      ? h('span', { className: 'status-ok', text: '✓', attrs: { 'aria-hidden': 'true' } })
      : canvasImage(statusIcon(status), 'status-icon'),
    t(`status.${status}`),
  ]);
}

export function issueText(
  issue: HabitatIssue,
  state: Readonly<GameState>,
  enclosureId: EnclosureId,
  species: SpeciesId,
): string {
  const def = SPECIES[species];
  const key: TextKey = `habitat.issue.${issue}`;
  switch (issue) {
    case 'tooSmall': {
      const required = animalsIn(state, enclosureId).reduce(
        (sum, a) => sum + SPECIES[a.species].minAreaPerAnimal,
        0,
      );
      return t(key, { area: state.enclosures[enclosureId]?.area ?? 0, required });
    }
    case 'wrongBiome':
      return t(key, { species: t(`species.${species}.the`), biome: t(`biome.${def.preferredBiome}.the`) });
    case 'lowEnrichment':
      return t(key, {
        decor: def.likedDecor.map((kind) => t(`building.${kind}.plural`)).join(t('habitat.or')),
      });
    case 'lonely':
      return t(key, { species: t(`species.${species}.the`), min: def.minGroup });
    case 'overcrowded':
      return t(key, { max: def.maxGroup });
    default:
      return t(key);
  }
}

export function issueList(
  report: HabitatReport,
  state: Readonly<GameState>,
  enclosureId: EnclosureId,
  species: SpeciesId,
): HTMLElement {
  if (report.issues.length === 0) return h('p', { className: 'panel-ok', text: `✓ ${t('panel.allGood')}` });
  return h(
    'ul',
    { className: 'issues', attrs: { 'aria-label': t('panel.problems') } },
    report.issues.map((issue) =>
      h('li', { attrs: { 'data-issue': issue } }, [
        h('span', { className: 'issue-mark', text: '✗', attrs: { 'aria-hidden': 'true' } }),
        issueText(issue, state, enclosureId, species),
      ]),
    ),
  );
}

export function criteriaList(report: HabitatReport): HTMLElement {
  const { weights } = balance.habitat;
  return h(
    'ul',
    { className: 'criteria' },
    (Object.keys(weights) as (keyof typeof weights)[]).map((criterion) => {
      const value = report.criteria[criterion];
      const mark = value >= 1 ? '✓' : value > 0 ? '◐' : '✗';
      return h('li', { attrs: { 'data-met': String(value >= 1) } }, [
        h('span', { className: 'criterion-mark', text: mark, attrs: { 'aria-hidden': 'true' } }),
        t('criterion.value', {
          name: t(`criterion.${criterion}`),
          weight: Math.round(weights[criterion] * 100),
          value: Math.round(value * 100),
        }),
      ]);
    }),
  );
}

export function equipmentCounts(state: Readonly<GameState>, enclosureId: EnclosureId): HTMLElement {
  const enclosure = state.enclosures[enclosureId];
  const water = enclosure?.tiles.filter((i) => state.world.tiles[i] === tileCode('water')).length ?? 0;
  let feeders = 0;
  let decor = 0;
  for (const building of Object.values(state.buildings)) {
    const index = building.tile.y * state.world.width + building.tile.x;
    if (state.world.enclosureOf[index] !== enclosureId) continue;
    if (BUILDINGS[building.kind].feeds) feeders++;
    else decor++;
  }
  return h('ul', { className: 'equipment', attrs: { 'aria-label': t('panel.contents') } }, [
    h('li', { text: t('panel.water', { count: water }) }),
    h('li', { text: t('panel.feeders', { count: feeders }) }),
    h('li', { text: t('panel.decor', { count: decor }) }),
  ]);
}
