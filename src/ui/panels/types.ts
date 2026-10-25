import type { Command, CommandResult } from '../../sim/commands';
import type { AnimalId, EnclosureId, VisitorId } from '../../sim/state';

// Ce que montre le panneau d'inspection, et comment un panneau en ouvre un autre ou agit sur la partie.

export type Selection =
  | { kind: 'zoo' }
  | { kind: 'economy' }
  | { kind: 'enclosure'; id: EnclosureId }
  | { kind: 'animal'; id: AnimalId }
  | { kind: 'visitor'; id: VisitorId };

export interface PanelNavigation {
  select(selection: Selection | null): void;
  /** Action du joueur depuis un panneau (prix du billet) : passe par une commande. */
  dispatch(command: Command): CommandResult;
}

export interface PanelContent {
  title: string;
  icon?: HTMLElement;
  body: (Node | null)[];
}
