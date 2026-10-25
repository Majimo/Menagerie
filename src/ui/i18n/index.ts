import type { CommandError, CommandErrorDetail } from '../../sim/commands';
import { SPECIES, type SpeciesId } from '../../sim/data/species';
import { fr, type TextKey } from './fr';

export type { TextKey };

export function t(key: TextKey, params?: Record<string, string | number>): string {
  const text: string = fr[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

/** Clé du message d'une commande refusée (le typage garantit qu'il existe un texte par raison). */
export function errorKey(error: CommandError): TextKey {
  return `error.${error}`;
}

export interface Refusal {
  error: CommandError;
  detail?: CommandErrorDetail;
}

/** Message d'un refus, avec les espèces concernées : « le lion ne peut pas vivre avec les zèbres ». */
export function errorText({ error, detail }: Refusal): string {
  if (!detail) return t(errorKey(error));
  return t(errorKey(error), {
    species: t(`species.${detail.species}.the`),
    other: t(`species.${detail.other}.plural`),
    max: SPECIES[detail.other].maxGroup,
  });
}

export function speciesName(species: SpeciesId): string {
  return t(`species.${species}`);
}

const numberFormat = new Intl.NumberFormat('fr-FR');

export function formatMoney(amount: number): string {
  return numberFormat.format(amount);
}

const ratingFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Note du zoo, une décimale : « 3,2 ». */
export function formatRating(rating: number): string {
  return ratingFormat.format(Math.floor(rating * 10) / 10);
}

/** Montant signé : « +1 200 », « −350 ». */
export function formatSigned(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded >= 0 ? '+' : '−'}${formatMoney(Math.abs(rounded))}`;
}
