import type { Scene } from '@babylonjs/core';
import { createEnemyEntity, type Enemy, type EnemySpec } from './enemy';
import type { TankComposition } from '../tank/sockets';

/** Feste Standard-Kompositionen — rotiert für etwas Optik-Abwechslung. */
const COMPS: TankComposition[] = [
  { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' },
  { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' },
  { chassis: 'c_box', wheels: 'w_tread', turret: 't_big', weapon: 'g_short' },
];

export interface SpawnerOptions {
  maxAlive: number; // wie viele gleichzeitig leben dürfen
  interval: number; // Sekunden zwischen Spawns
  radiusMin: number; // Spawn-Abstand zum Spieler (außer Sicht)
  radiusMax: number;
  maxLevel: number; // höchstes Spawn-Level
}

export interface Spawner {
  /** Pro Frame; gibt einen neuen Gegner zurück, wenn einer fällig ist (sonst null). */
  update(simDt: number, playerX: number, playerZ: number, aliveCount: number): Enemy | null;
  /** Maximale gleichzeitige Gegner zur Laufzeit ändern. */
  setMaxAlive(n: number): void;
  /** Sekunden zwischen Spawns zur Laufzeit ändern. */
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
  let compSeq = 0; // rotiert über COMPS
  let maxAlive = opts.maxAlive;
  let spawnInterval = opts.interval;

  function update(simDt: number, px: number, pz: number, aliveCount: number): Enemy | null {
    cd -= simDt;
    if (aliveCount >= maxAlive || cd > 0) return null;
    cd = spawnInterval;

    // Position: Ring um den Spieler unter zufälligem Winkel (kommt von außerhalb).
    const ang = rng() * Math.PI * 2;
    const r = opts.radiusMin + rng() * (opts.radiusMax - opts.radiusMin);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;

    const level = 1 + Math.floor(rng() * opts.maxLevel);
    const spec: EnemySpec = {
      id: 'e' + seq++,
      comp: COMPS[compSeq++ % COMPS.length]!,
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
