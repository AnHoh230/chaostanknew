import { describe, it, expect } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { createEnemyEntity, type EnemySpec } from './enemy';

function makeScene(): Scene {
  return new Scene(new NullEngine());
}

function specAtLevel(level: number): EnemySpec {
  return {
    id: 'e1',
    motiveId: 'aasgeier',
    traits: { mut: 0.5, stolz: 0.5, gier: 0.5, geselligkeit: 0.5, vorsicht: 0.5, fortschrittsdrang: 0.5 },
    comp: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' },
    spawn: { x: 10, z: 20 },
    level,
    displayName: 'Panzer 1',
  };
}

describe('createEnemyEntity — volles Set beim Spawn + Gnadenzeit', () => {
  it('spawnt mit vollem Basis-Set (abwechslungsreiche Drops), kampfbereit + unverwundbar', () => {
    const e = createEnemyEntity(makeScene(), specAtLevel(3), 1, () => 0.5);
    expect(e.equipment.length).toBe(5); // ein Teil je Slot → Drops über alle Slots
    expect(new Set(e.equipment.map((i) => i.slot)).size).toBe(5);
    expect(e.credits).toBe(0); // verdient Credits über Kills
    expect(e.shopState).toBe('kaempfen');
    expect(e.spawnInvulnCd).toBe(5);
    expect(e.combatant.invulnerable).toBe(true);
    expect(e.prog.level).toBe(3);
  });

  it('höhere MK = zäher (Stats aus dem vollen Set, nicht aus dem Level direkt)', () => {
    const lo = createEnemyEntity(makeScene(), specAtLevel(1), 1, () => 0.5);
    const hi = createEnemyEntity(makeScene(), specAtLevel(9), 1, () => 0.5);
    expect(hi.combatant.maxHp).toBeGreaterThan(lo.combatant.maxHp);
  });
});
