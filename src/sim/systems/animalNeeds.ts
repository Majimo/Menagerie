import { balance } from '../data/balance';
import { SPECIES } from '../data/species';
import type { Animal, GameState } from '../state';
import { type HabitatReport, habitatReport } from '../world/habitat';

// Système `animalNeeds` : faim, soif, bien-être (tend vers le score d'habitat), santé, mort par privation.

export function updateAnimalNeeds(state: GameState): void {
  const reports = new Map<string, HabitatReport>();
  const reportFor = (animal: Animal): HabitatReport => {
    const key = `${animal.enclosureId}:${animal.species}`;
    let report = reports.get(key);
    if (!report) {
      report = habitatReport(state, animal.enclosureId, animal.species);
      reports.set(key, report);
    }
    return report;
  };

  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt >= 0) {
      if (state.tick - animal.diedAt >= balance.animals.corpseTicks) delete state.animals[animal.id];
      continue;
    }
    updateGauges(state, animal, reportFor(animal));
  }
}

function updateGauges(state: GameState, animal: Animal, report: HabitatReport): void {
  const { ticksPerDay } = balance.time;
  const { wellbeingPerDay, deprivationDays, healthLossPerDay, healthRegenPerDay, startHealth } =
    balance.animals;
  const def = SPECIES[animal.species];

  animal.hunger = Math.max(0, animal.hunger - def.foodPerDay / ticksPerDay);
  animal.thirst = Math.max(0, animal.thirst - def.waterPerDay / ticksPerDay);
  const step = wellbeingPerDay / ticksPerDay;
  const gap = report.target - animal.wellbeing;
  animal.wellbeing = Math.abs(gap) <= step ? report.target : animal.wellbeing + Math.sign(gap) * step;

  const deprived = animal.hunger <= 0 || animal.thirst <= 0 || animal.wellbeing <= 0;
  animal.deprivationTicks = deprived ? animal.deprivationTicks + 1 : 0;
  if (animal.deprivationTicks >= deprivationDays * ticksPerDay) {
    animal.health = Math.max(0, animal.health - healthLossPerDay / ticksPerDay);
  } else if (!deprived) {
    animal.health = Math.min(startHealth, animal.health + healthRegenPerDay / ticksPerDay);
  }

  if (animal.health <= 0) {
    animal.diedAt = state.tick;
    animal.activity = 'dead';
    animal.path = [];
  }
}
