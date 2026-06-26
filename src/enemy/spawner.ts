import type { Scene } from '@babylonjs/core';
import { createEnemyEntity, type Enemy, type EnemySpec } from './enemy';
import { ENEMY_TYPES } from './enemyTypes';
import { pickWeighted, type SwarmPlan } from '../doctrine/spawnPlan';

export interface SpawnerOptions {
  interval(): number; // Sekunden zwischen Spawns (live per Regler); plan.interval überschreibt
  radiusMin: number; // Spawn-Abstand zum Spieler (außer Sicht)
  radiusMax: number;
  maxLevel: number; // höchstes Spawn-Level
  hpMul?: () => number; // Live-Faktor auf Gegner-HP (Schwarm-Tuning)
  dmgMul?: () => number; // Live-Faktor auf Gegner-Schaden
  clumpSize?: (typeId: string) => number; // wie viele eines Typs als Pulk auf EINEN Punkt (Default 1)
}

export interface Spawner {
  /**
   * Pro Frame; spawnt fälligen Nachschub, solange weniger als `plan.targetCount` leben. Der Typ wird
   * gewichtet aus `plan.weights` gezogen. Gibt die neu erzeugten Gegner zurück — i. d. R. einen, bei
   * Pulk-Typen (clumpSize > 1) gleich einen Haufen auf einen Punkt. Leeres Array = kein Spawn.
   */
  update(simDt: number, playerX: number, playerZ: number, aliveCount: number, plan: SwarmPlan): Enemy[];
}

export function createSpawner(
  scene: Scene,
  tankRadius: number,
  rng: () => number,
  opts: SpawnerOptions,
): Spawner {
  let cd = 1.0; // erste Welle kommt schnell
  let seq = 0;
  let nameSeq = 0; // fortlaufende "Panzer N"-Nummer

  const CLUMP_JIT = 8; // Streuung eines Pulks um SEINEN gemeinsamen Ring-Punkt (eng beieinander)

  // EIN Punkt auf dem Ring um (px,pz) (außer Sicht) — der ganze Pulk landet hier, nicht versetzt.
  function ringPoint(px: number, pz: number): { x: number; z: number } {
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    return { x: px + Math.cos(ang) * r, z: pz + Math.sin(ang) * r };
  }

  // Einen Gegner eines Typs an einem GEGEBENEN Punkt erzeugen (Jitter um den Punkt).
  function spawnAt(typeId: string, cx: number, cz: number, jit: number): Enemy | null {
    const type = ENEMY_TYPES[typeId];
    if (!type) return null;
    const spec: EnemySpec = {
      id: 'e' + seq++,
      comp: type.comp,
      spawn: { x: cx + (rng() - 0.5) * jit, z: cz + (rng() - 0.5) * jit },
      level: 1 + Math.floor(rng() * opts.maxLevel),
      displayName: 'Panzer ' + ++nameSeq,
      typeId: type.id,
      behavior: type.behavior,
    };
    return createEnemyEntity(scene, spec, tankRadius, rng, opts.hpMul ? opts.hpMul() : 1, opts.dmgMul ? opts.dmgMul() : 1);
  }

  // Einen Typ spawnen: Pulk-Typen (clumpSize > 1) als HAUFEN auf EINEN gemeinsamen Ring-Punkt
  // (kommen zusammen, nicht versetzt); Einzel-Typen exakt auf ihren Punkt.
  function spawnTyp(typeId: string, px: number, pz: number, out: Enemy[]): void {
    const n = Math.max(1, opts.clumpSize ? opts.clumpSize(typeId) : 1);
    const c = ringPoint(px, pz); // EIN Punkt für den ganzen Pulk
    const jit = n > 1 ? CLUMP_JIT : 0;
    for (let k = 0; k < n; k++) { const e = spawnAt(typeId, c.x, c.z, jit); if (e) out.push(e); }
  }

  function update(simDt: number, px: number, pz: number, aliveCount: number, plan: SwarmPlan): Enemy[] {
    cd -= simDt;
    if (cd > 0) return [];

    // BATCH-MODUS (Garten): alle `interval` s genau `batch` Gegner — KEIN Auffüllen auf ein Ziel.
    // Die Dichte ergibt sich aus Spawn-Rate vs. Kill-Rate; `targetCount` ist nur ein Safety-Deckel.
    if (plan.batch != null) {
      cd = Math.max(0.3, plan.interval ?? opts.interval());
      if (aliveCount >= plan.targetCount) return []; // Safety (selten erreicht)
      const out: Enemy[] = [];
      for (let b = 0; b < plan.batch; b++) {
        const typeId = pickWeighted(plan.weights, rng());
        if (!typeId) break;
        spawnTyp(typeId, px, pz, out); // Pulk-Typen als Haufen auf EINEN Punkt, sonst einzeln
      }
      return out;
    }

    // AUFFÜLL-MODUS (Doktrin/Nicht-Garten): bis `targetCount` auffüllen, einer (oder Pulk) pro Takt.
    if (aliveCount >= plan.targetCount) return [];
    cd = Math.max(0.1, plan.interval ?? opts.interval());
    const typeId = pickWeighted(plan.weights, rng());
    if (!typeId) return [];
    const out: Enemy[] = [];
    spawnTyp(typeId, px, pz, out); // Pulk-Typen als Haufen auf EINEN Punkt, sonst einzeln
    return out;
  }

  return { update };
}
