import { describe, it, expect } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { createEnemyEntity, type EnemySpec } from './enemy';

function makeScene(): Scene {
  return new Scene(new NullEngine());
}

function specAtLevel(level: number): EnemySpec {
  return {
    id: 'e1',
    comp: { chassis: 'c_box', wheels: 'w_round', turret: 't_small', weapon: 'g_short' },
    spawn: { x: 10, z: 20 },
    level,
    displayName: 'Panzer 1',
    typeId: 'closer',
    behavior: 'closer',
  };
}

describe('createEnemyEntity — schlanker Combatant', () => {
  it('spawnt mit fester Fraktion und kampfbereit (Stats aus dem Level)', () => {
    const e = createEnemyEntity(makeScene(), specAtLevel(3), 1, () => 0.5);
    expect(e.combatant.team).toBe('enemy'); // alle Gegner = eine Fraktion
    expect(e.combatant.alive).toBe(true);
    expect(e.level).toBe(3);
    expect(e.damage).toBeGreaterThan(0);
    expect(e.combatant.maxHp).toBeGreaterThan(0);
    expect(e.fireCd).toBe(0);
  });

  it('höheres Level = zäher (Stats direkt aus dem Level)', () => {
    const lo = createEnemyEntity(makeScene(), specAtLevel(1), 1, () => 0.5);
    const hi = createEnemyEntity(makeScene(), specAtLevel(9), 1, () => 0.5);
    expect(hi.combatant.maxHp).toBeGreaterThan(lo.combatant.maxHp);
  });
});
