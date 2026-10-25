// PRNG seedé (mulberry32), seule source d'aléa autorisée dans src/sim/ (règle d'architecture n° 3).
// Son état est un simple entier stocké dans l'état de jeu : la sauvegarde et le replay le reprennent tel quel.

export interface RngHolder {
  rngState: number;
}

/** Nombre pseudo-aléatoire dans [0, 1). Fait avancer `holder.rngState`. */
export function nextFloat(holder: RngHolder): number {
  const a = (holder.rngState + 0x6d2b79f5) | 0;
  holder.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entier pseudo-aléatoire dans [min, maxExclusive). */
export function nextInt(holder: RngHolder, min: number, maxExclusive: number): number {
  return min + Math.floor(nextFloat(holder) * (maxExclusive - min));
}
