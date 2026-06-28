/**
 * Schlafende Gegner-Nester (Spec Sektion 3.3): aktivieren bei Entdeckung, droppen bei Räumung
 * LEBEN (HP) — NIE Impulse. Rein; das Spawnen/Töten der Nest-Gegner macht main.ts über das
 * bestehende Gegner-System, diese Logik zählt nur Zustand und Belohnung.
 */
import type { Rng } from '../../core/rng';
import { MAP_TUNING } from './mapTuning';

export interface NestState {
  entdeckt: boolean;
  wach: boolean;
  rest: number; // verbleibende Nest-Gegner
}

export function createNest(gegner: number): NestState {
  return { entdeckt: false, wach: false, rest: Math.max(0, Math.floor(gegner)) };
}

/** Erweckt das Nest, sobald der Spieler im Radius ist. Gibt true NUR im erweckenden Aufruf zurück. */
export function pruefeEntdeckung(nest: NestState, distanz: number, radius: number): boolean {
  if (nest.wach || nest.rest <= 0) return false;
  if (distanz <= radius) {
    nest.entdeckt = true;
    nest.wach = true;
    return true;
  }
  return false;
}

export function nestGegnerGefallen(nest: NestState): void {
  if (nest.rest > 0) nest.rest -= 1;
}

export function nestGeraeumt(nest: NestState): boolean {
  return nest.wach && nest.rest <= 0;
}

export const LEBEN_PRO_DROP = MAP_TUNING.nestLebenProDrop;

export function lebenDropAnzahl(rng: Rng): number {
  const [min, max] = MAP_TUNING.nestLebenAnzahl;
  return min + rng.int(max - min + 1);
}
