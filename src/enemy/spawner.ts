import type { Scene } from '@babylonjs/core';
import { createEnemyEntity, type Enemy, type EnemySpec } from './enemy';
import { MOTIVE_PRESETS } from '../ai/motives';
import type { TankComposition } from '../tank/sockets';

/** Motiv → sichtbar verschiedene Teile-Komposition (Primitive bis Assets/M8). */
const MOTIVE_COMP: Record<string, TankComposition> = {
  aasgeier: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' },
  angsthase: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_small', weapon: 'g_short' },
  platzhirsch: { chassis: 'c_box', wheels: 'w_tread', turret: 't_big', weapon: 'g_short' },
  schatzjaeger: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_long' },
  aufruester: { chassis: 'c_box', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' },
  rudelfuehrer: { chassis: 'c_wide', wheels: 'w_round', turret: 't_big', weapon: 'g_short' },
};
const MOTIVE_IDS = Object.keys(MOTIVE_PRESETS);

export interface SpawnerOptions {
  maxAlive: number; // wie viele gleichzeitig leben dürfen
  interval: number; // Sekunden zwischen Spawns
  radiusMin: number; // Spawn-Abstand zum Spieler (außer Sicht)
  radiusMax: number;
  baseHp: number;
}

export interface Spawner {
  /** Pro Frame; gibt einen neuen Gegner zurück, wenn einer fällig ist (sonst null). */
  update(simDt: number, playerX: number, playerZ: number, aliveCount: number): Enemy | null;
}

export function createSpawner(
  scene: Scene,
  tankRadius: number,
  rng: () => number,
  opts: SpawnerOptions,
): Spawner {
  let cd = 1.0; // erste Welle kommt schnell
  let seq = 0;

  function update(simDt: number, px: number, pz: number, aliveCount: number): Enemy | null {
    cd -= simDt;
    if (aliveCount >= opts.maxAlive || cd > 0) return null;
    cd = opts.interval;

    // Position: Ring um den Spieler unter zufälligem Winkel (kommt von außerhalb).
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;

    const motiveId = MOTIVE_IDS[Math.floor(rng() * MOTIVE_IDS.length)]!;
    const spec: EnemySpec = {
      id: 'e' + seq++,
      motiveId,
      traits: MOTIVE_PRESETS[motiveId]!,
      comp: MOTIVE_COMP[motiveId] ?? MOTIVE_COMP.aasgeier!,
      spawn: { x, z },
      hp: Math.round(opts.baseHp * (0.85 + rng() * 0.4)),
      lootValue: 0.3 + rng() * 0.4,
    };
    return createEnemyEntity(scene, spec, tankRadius, rng);
  }

  return { update };
}
