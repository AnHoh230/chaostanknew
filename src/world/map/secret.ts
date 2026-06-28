/**
 * Secret-Rampe → Bonus-Insel (Spec Sektion 3.3). Rein: Auslöse-Schwelle + Parabel-Sprung-Bogen.
 * main.ts überschreibt damit die Spieler-Position für die Flugdauer.
 */
import type { Vec2 } from './mapTypes';
import { MAP_TUNING } from './mapTuning';

export function rampeAusgeloest(geschwindigkeit: number, schwelle = MAP_TUNING.rampenSchubSchwelle): boolean {
  return geschwindigkeit >= schwelle;
}

export interface BogenPunkt {
  x: number;
  y: number;
  z: number;
}

/** Parabel-Sprung von start (y=0) nach ziel (y=0); Scheitel `hoehe` in der Mitte. t in [0, dauer]. */
export function sprungBogen(t: number, dauer: number, start: Vec2, ziel: Vec2, hoehe: number): BogenPunkt {
  const u = dauer <= 0 ? 1 : Math.max(0, Math.min(1, t / dauer));
  return {
    x: start.x + (ziel.x - start.x) * u,
    z: start.z + (ziel.z - start.z) * u,
    y: 4 * hoehe * u * (1 - u),
  };
}

export function sprungFertig(t: number, dauer: number): boolean {
  return t >= dauer;
}
