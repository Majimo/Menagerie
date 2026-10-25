import { fr, type TextKey } from './fr';

export type { TextKey };

export function t(key: TextKey): string {
  return fr[key];
}
