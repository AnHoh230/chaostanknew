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
  maxLevel: number; // höchstes Spawn-Level (Gegner leveln im Spiel weiter hoch)
}

export interface Spawner {
  /** Pro Frame; gibt einen neuen Gegner zurück, wenn einer fällig ist (sonst null). */
  update(simDt: number, playerX: number, playerZ: number, aliveCount: number): Enemy | null;
  /** Maximale gleichzeitige Gegner zur Laufzeit ändern (Regler im Panel). */
  setMaxAlive(n: number): void;
  /** Sekunden zwischen Spawns zur Laufzeit ändern (Regler im Panel). */
  setInterval(seconds: number): void;
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
  let maxAlive = opts.maxAlive; // zur Laufzeit über setMaxAlive änderbar
  let spawnInterval = opts.interval; // zur Laufzeit über setInterval änderbar

  function update(simDt: number, px: number, pz: number, aliveCount: number): Enemy | null {
    cd -= simDt;
    if (aliveCount >= maxAlive || cd > 0) return null;
    cd = spawnInterval;

    // Position: Ring um den Spieler unter zufälligem Winkel (kommt von außerhalb).
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;

    const motiveId = MOTIVE_IDS[Math.floor(rng() * MOTIVE_IDS.length)]!;
    const level = 1 + Math.floor(rng() * opts.maxLevel);
    const spec: EnemySpec = {
      id: 'e' + seq++,
      motiveId,
      traits: MOTIVE_PRESETS[motiveId]!,
      comp: MOTIVE_COMP[motiveId] ?? MOTIVE_COMP.aasgeier!,
      spawn: { x, z },
      level,
      displayName: 'Panzer ' + ++nameSeq,
    };
    return createEnemyEntity(scene, spec, tankRadius, rng);
  }

  return {
    update,
    setMaxAlive: (n) => {
      maxAlive = Math.max(0, Math.round(n));
    },
    setInterval: (seconds) => {
      spawnInterval = Math.max(0.2, seconds);
    },
  };
}
