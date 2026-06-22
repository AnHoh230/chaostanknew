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

  function update(simDt: number, px: number, pz: number, aliveCount: number, plan: SwarmPlan): Enemy[] {
    cd -= simDt;
    if (aliveCount >= plan.targetCount || cd > 0) return [];
    cd = Math.max(0.1, plan.interval ?? opts.interval());

    const typeId = pickWeighted(plan.weights, rng());
    if (!typeId) return [];
    const type = ENEMY_TYPES[typeId];
    if (!type) return [];

    // Position: Ring um den Spieler unter zufälligem Winkel (kommt von außerhalb der Sicht).
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    const cx = px + Math.cos(ang) * r;
    const cz = pz + Math.sin(ang) * r;

    // Pulk-Typen erscheinen als Haufen auf EINEM Punkt (leichter Versatz), der Rest einzeln.
    const n = Math.max(1, opts.clumpSize ? opts.clumpSize(typeId) : 1);
    const out: Enemy[] = [];
    for (let k = 0; k < n; k++) {
      const jit = n > 1 ? 5 : 0;
      const spec: EnemySpec = {
        id: 'e' + seq++,
        comp: type.comp,
        spawn: { x: cx + (rng() - 0.5) * jit, z: cz + (rng() - 0.5) * jit },
        level: 1 + Math.floor(rng() * opts.maxLevel),
        displayName: 'Panzer ' + ++nameSeq,
        typeId: type.id,
        behavior: type.behavior,
      };
      out.push(createEnemyEntity(scene, spec, tankRadius, rng, opts.hpMul ? opts.hpMul() : 1, opts.dmgMul ? opts.dmgMul() : 1));
    }
    return out;
  }

  return { update };
}
