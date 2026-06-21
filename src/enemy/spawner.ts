import type { Scene } from '@babylonjs/core';
import { createEnemyEntity, type Enemy, type EnemySpec } from './enemy';
import { ENEMY_TYPES } from './enemyTypes';
import { pickWeighted, type SwarmPlan } from '../doctrine/spawnPlan';

export interface SpawnerOptions {
  interval(): number; // Sekunden zwischen Spawns (live per Regler)
  radiusMin: number; // Spawn-Abstand zum Spieler (außer Sicht)
  radiusMax: number;
  maxLevel: number; // höchstes Spawn-Level
  hpMul?: () => number; // Live-Faktor auf Gegner-HP (Schwarm-Tuning)
}

export interface Spawner {
  /**
   * Pro Frame; spawnt einen neuen Gegner, solange weniger als `plan.targetCount` leben und der
   * Takt fällig ist. Der Typ wird gewichtet aus `plan.weights` gezogen (stil-getriebener Mix).
   */
  update(simDt: number, playerX: number, playerZ: number, aliveCount: number, plan: SwarmPlan): Enemy | null;
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

  function update(simDt: number, px: number, pz: number, aliveCount: number, plan: SwarmPlan): Enemy | null {
    cd -= simDt;
    if (aliveCount >= plan.targetCount || cd > 0) return null;
    cd = Math.max(0.1, opts.interval());

    const typeId = pickWeighted(plan.weights, rng());
    if (!typeId) return null;
    const type = ENEMY_TYPES[typeId];
    if (!type) return null;

    // Position: Ring um den Spieler unter zufälligem Winkel (kommt von außerhalb der Sicht).
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;

    const level = 1 + Math.floor(rng() * opts.maxLevel);
    const spec: EnemySpec = {
      id: 'e' + seq++,
      comp: type.comp,
      spawn: { x, z },
      level,
      displayName: 'Panzer ' + ++nameSeq,
      typeId: type.id,
      behavior: type.behavior,
    };
    return createEnemyEntity(scene, spec, tankRadius, rng, opts.hpMul ? opts.hpMul() : 1);
  }

  return { update };
}
