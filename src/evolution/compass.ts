/**
 * Schicht 2 — der Kompass (Spielerabsicht). Reine Mathematik: ein Punkt im Dreieck (drei Pole
 * Kern/Raum/Zustand = sniper/aoe/dot) → drei Gewichte, die sich zu 1 summieren; plus zeitliche
 * Glättung, damit Zittern nicht ständig die Route splittet (Spec 4.6 §5/§6).
 */
import type { CompassWeights } from './channels';

export interface Vec2 {
  x: number;
  y: number;
}

/** Barycentrische Gewichte eines Punktes p im Dreieck (a,b,c), außerhalb geklemmt + normiert. */
export function baryWeights(p: Vec2, a: Vec2, b: Vec2, c: Vec2): { wa: number; wb: number; wc: number } {
  const v0x = b.x - a.x, v0y = b.y - a.y;
  const v1x = c.x - a.x, v1y = c.y - a.y;
  const v2x = p.x - a.x, v2y = p.y - a.y;
  const den = v0x * v1y - v1x * v0y;
  if (Math.abs(den) < 1e-9) return { wa: 1 / 3, wb: 1 / 3, wc: 1 / 3 };
  let wb = (v2x * v1y - v1x * v2y) / den;
  let wc = (v0x * v2y - v2x * v0y) / den;
  let wa = 1 - wb - wc;
  wa = Math.max(0, wa); wb = Math.max(0, wb); wc = Math.max(0, wc);
  const s = wa + wb + wc || 1;
  return { wa: wa / s, wb: wb / s, wc: wc / s };
}

/**
 * Kompassgewichte aus der (normierten, 0..1) Mausposition. Pole im Bildschirm-Dreieck:
 * Kern oben-Mitte (sniper-Pol), Raum unten-links (aoe), Zustand unten-rechts (dot).
 * „Kern" ist immer der EIGENE Grundstil-Pol — die Zuordnung Pol→Kanal macht channelWeight.
 */
export const POLE_KERN: Vec2 = { x: 0.5, y: 0.15 };
export const POLE_RAUM: Vec2 = { x: 0.2, y: 0.85 };
export const POLE_ZUSTAND: Vec2 = { x: 0.8, y: 0.85 };

export function weightsFromPointer(mxNorm: number, myNorm: number): CompassWeights {
  const { wa, wb, wc } = baryWeights({ x: mxNorm, y: myNorm }, POLE_KERN, POLE_RAUM, POLE_ZUSTAND);
  return { sniper: wa, aoe: wb, dot: wc };
}

/** Exponentielle Glättung Richtung Ziel (frame-ratenunabhängig über ein Zeitfenster). */
export function smoothToward(cur: CompassWeights, target: CompassWeights, dt: number, windowSec: number): CompassWeights {
  const k = windowSec <= 0 ? 1 : Math.min(1, dt / windowSec);
  const lerp = (a: number, b: number): number => a + (b - a) * k;
  const w = { sniper: lerp(cur.sniper, target.sniper), aoe: lerp(cur.aoe, target.aoe), dot: lerp(cur.dot, target.dot) };
  const s = w.sniper + w.aoe + w.dot || 1;
  return { sniper: w.sniper / s, aoe: w.aoe / s, dot: w.dot / s };
}

export interface CompassState {
  raw: CompassWeights;
  smoothed: CompassWeights;
}

/** Startzustand: voll auf den eigenen Kern (ohne Eingabe wächst zuerst die Grundstil-Meisterschaft). */
export function createCompassState(): CompassState {
  const core: CompassWeights = { sniper: 1, aoe: 0, dot: 0 };
  return { raw: { ...core }, smoothed: { ...core } };
}
