/**
 * Reine Gameplay-Logik der Karten-Entities (Spec Sektion 3.3). Engine-frei, Vitest-getestet.
 * Invariante: KEIN Loot/Effekt gibt jemals Impulse — nur Heilung, Toys oder nichts.
 */
import type { Rng } from '../../core/rng';
import { MAP_TUNING } from './mapTuning';

// — Breakable —
export interface BreakableState {
  hp: number;
}
export type LootDrop =
  | { art: 'none' }
  | { art: 'heal'; menge: number }
  | { art: 'toy'; toy: string };

export function breakableHp(hpKey: string): number {
  return MAP_TUNING.breakableHp[hpKey] ?? 1;
}
export function createBreakable(hpKey: string): BreakableState {
  return { hp: breakableHp(hpKey) };
}
export function treffeBreakable(state: BreakableState, dmg: number): { state: BreakableState; zerstoert: boolean } {
  const hp = Math.max(0, state.hp - Math.max(0, dmg));
  return { state: { hp }, zerstoert: hp <= 0 };
}
/** Loot beim Zertrümmern — NIE Impuls (Invariante). Deterministisch über rng. */
export function breakableLoot(rng: Rng): LootDrop {
  const r = rng.next();
  if (r < 0.6) return { art: 'none' };
  if (r < 0.85) return { art: 'heal', menge: 6 };
  return { art: 'toy', toy: 'querschlaeger' };
}

// — Hazard —
export function hazardSchaden(dmgKey: string): number {
  return MAP_TUNING.hazardDmg[dmgKey] ?? 10;
}
/** Getaktete Hazards (z.B. Presse) sind nur in der ersten Hälfte jedes Zyklus aktiv; ungetaktete immer. */
export function hazardAktiv(dmgKey: string, getaktet: boolean, t: number): boolean {
  if (!getaktet) return true;
  const periode = MAP_TUNING.hazardZyklus[dmgKey] ?? 2;
  return t % periode < periode / 2;
}

// — Collectible —
export type CollectibleEffekt =
  | { art: 'heal'; menge: number }
  | { art: 'toy'; toy: string };

export function sammleCollectible(effekt: string): CollectibleEffekt {
  if (effekt === 'heal') return { art: 'heal', menge: MAP_TUNING.collectibleHeal };
  return { art: 'toy', toy: effekt };
}
