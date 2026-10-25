import type { CommandError } from '../../sim/commands';
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

const numberFormat = new Intl.NumberFormat('fr-FR');

export function formatMoney(amount: number): string {
  return numberFormat.format(amount);
}
