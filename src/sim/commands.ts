// Commandes du joueur, appliquées par la simulation. Introduites à l'itération 1
// (PlacePath, PlaceFence, PaintBiome, Demolish).

export type Command = never;

/** Résultat d'une commande : `error` est une clé i18n lisible par le joueur. */
export type CommandResult = { ok: true } | { ok: false; error: string };
