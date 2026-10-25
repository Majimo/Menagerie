import type { AnimalId, EnclosureId } from '../../sim/state';

// Ce que montre le panneau d'inspection, et comment un panneau en ouvre un autre.

export type Selection =
  | { kind: 'zoo' }
  | { kind: 'enclosure'; id: EnclosureId }
  | { kind: 'animal'; id: AnimalId };

export interface PanelNavigation {
  select(selection: Selection | null): void;
}

export interface PanelContent {
  title: string;
  icon?: HTMLElement;
  body: (Node | null)[];
}
