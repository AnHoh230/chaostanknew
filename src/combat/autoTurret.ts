import { yawTo } from '../input/aimMath';
import { applyJitter } from './accuracy';

export interface AutoTurretState {
  cooldown: number; // Sekunden bis zum nächsten Schuss (tickt runter)
  range: number; // Reichweite der Zielerfassung
  fireInterval: number; // Sekunden zwischen Schüssen
  damage: number;
  accuracy: number; // 0..1 — streut die Schussrichtung
}

export interface AutoTurretTarget {
  x: number;
  z: number;
}

export interface AutoTurretResult {
  fire: boolean;
  targetX?: number;
  targetZ?: number;
  dir?: number; // gestreute Schussrichtung (rad), nur wenn fire
}

/**
 * Ein Auto-Turret-Tick (rein, mutiert nur state.cooldown): nächstes Ziel in
 * Reichweite wählen; bei freiem Cooldown feuern (Richtung gemäß Treffsicherheit
 * gestreut) und Cooldown zurücksetzen. Für Spieler-Sekundärwaffe UND Gegner.
 */
export function stepAutoTurret(
  selfX: number,
  selfZ: number,
  state: AutoTurretState,
  candidates: readonly AutoTurretTarget[],
  dt: number,
  rng: () => number,
): AutoTurretResult {
  if (state.cooldown > 0) state.cooldown -= dt;

  let best: AutoTurretTarget | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - selfX, c.z - selfZ);
    if (d <= state.range && d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  if (state.cooldown > 0 || !best) return { fire: false };

  state.cooldown = state.fireInterval;
  const dir = applyJitter(yawTo(selfX, selfZ, best.x, best.z), state.accuracy, rng);
  return { fire: true, targetX: best.x, targetZ: best.z, dir };
}
