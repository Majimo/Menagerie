// Gabarits de visiteurs (docs/02) : l'enfant préfère les animaux mignons, se lasse et a faim plus vite, paie moitié prix.

export interface VisitorKindDef {
  /** Part des arrivées. */
  share: number;
  /** Part du prix du billet payée. */
  ticketRatio: number;
  /** Vitesse de marche, en tuiles par tick. */
  walkSpeed: number;
  /** Patience perdue par tick hors observation. */
  patienceLossPerTick: number;
  /** Faim perdue par tick (100 = rassasié). */
  hungerLossPerTick: number;
  /** Poids de la « mignonnerie » d'une espèce dans l'intérêt (0 = ignorée). */
  cutenessWeight: number;
  /** Nombre d'enclos que le visiteur veut voir : [min, max]. */
  views: readonly [number, number];
  /** Nombre de variantes de couleur du modèle. */
  variants: number;
  modelId: string;
}

export const VISITOR_KINDS = {
  adult: {
    share: 0.65,
    ticketRatio: 1,
    walkSpeed: 0.2,
    patienceLossPerTick: 0.12,
    hungerLossPerTick: 0.07,
    cutenessWeight: 0.3,
    views: [2, 5],
    variants: 6,
    modelId: 'visitor.adult',
  },
  child: {
    share: 0.35,
    ticketRatio: 0.5,
    walkSpeed: 0.18,
    patienceLossPerTick: 0.2,
    hungerLossPerTick: 0.11,
    cutenessWeight: 1,
    views: [2, 4],
    variants: 6,
    modelId: 'visitor.child',
  },
} as const satisfies Record<string, VisitorKindDef>;

export type VisitorKind = keyof typeof VISITOR_KINDS;

export const VISITOR_KINDS_LIST = Object.keys(VISITOR_KINDS) as VisitorKind[];
