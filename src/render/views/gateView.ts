import { Group } from 'three';
import type { World } from '../../sim/state';
import { t } from '../../ui/i18n';
import { getModel } from '../assets';
import { createLabel, type Label } from '../labels';

// Entrée et sortie du zoo : portes posées sur leur tuile, avec une étiquette lisible à tous les zooms.

export interface GateView {
  readonly group: Group;
  setViewSize(viewSize: number): void;
}

export function createGateView(world: Readonly<World>): GateView {
  const group = new Group();
  const labels: Label[] = [];
  const gates = [
    { tile: world.entrance, model: 'gate-entrance', text: t('world.entrance'), background: '#2f7148' },
    { tile: world.exit, model: 'gate-exit', text: t('world.exit'), background: '#5c3d22' },
  ];
  for (const { tile, model, text, background } of gates) {
    const gate = getModel(model);
    gate.position.set(tile.x + 0.5, 0.04, tile.y + 0.5);
    group.add(gate);
    const label = createLabel(text, background, '#fff6e5');
    label.sprite.position.set(tile.x + 0.5, 2.6, tile.y + 0.5);
    group.add(label.sprite);
    labels.push(label);
  }
  return {
    group,
    setViewSize(viewSize) {
      for (const label of labels) label.setViewSize(viewSize);
    },
  };
}
