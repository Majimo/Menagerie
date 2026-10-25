import { balance } from './data/balance';

// Heure de jeu, dérivée du compteur de ticks (pas d'horloge réelle dans la simulation).

export interface TimeOfDay {
  /** Jour de jeu, à partir de 1. */
  day: number;
  /** Heure décimale dans [0, 24). */
  hour: number;
  /** Les animaux dorment. */
  sleeping: boolean;
  /** Nuit visuelle (éclairage). */
  night: boolean;
}

function inWindow(hour: number, from: number, to: number): boolean {
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

export function timeOfDay(tick: number): TimeOfDay {
  const { ticksPerDay, startHour, sleepHour, wakeHour, nightStartHour, nightEndHour } = balance.time;
  const elapsedHours = (tick / ticksPerDay) * 24 + startHour;
  const hour = elapsedHours % 24;
  return {
    day: Math.floor(elapsedHours / 24) + 1,
    hour,
    sleeping: inWindow(hour, sleepHour, wakeHour),
    night: inWindow(hour, nightStartHour, nightEndHour),
  };
}

/** Nombre de ticks pour avancer jusqu'à l'heure `hour` (prochaine occurrence, 0 si on y est). */
export function ticksUntilHour(tick: number, hour: number): number {
  const { ticksPerDay } = balance.time;
  const current = timeOfDay(tick).hour;
  const deltaHours = (hour - current + 24) % 24;
  return Math.round((deltaHours / 24) * ticksPerDay);
}
