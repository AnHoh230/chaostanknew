import { describe, it, expect } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { createEnemyEntity, type EnemySpec } from './enemy';
import { enemyMk } from './equipment';
import { mostExpensiveItemPrice } from '../shop/catalog';

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

describe('createEnemyEntity — Sofort-Erstkauf + Spawn-Gnadenzeit', () => {
  it('kauft sofort beim Erscheinen (kein Shop-Feld), startet kampfbereit + unverwundbar', () => {
    const e = createEnemyEntity(makeScene(), specAtLevel(3), 1, () => 0.5);
    // Startgeld = teuerstes MK2-Item (340) → kauft genau die Waffe, Rest 0.
    expect(e.equipment.length).toBeGreaterThan(0);
    expect(e.equipment[0]!.slot).toBe('waffe'); // schwächster/leerer Slot zuerst
    expect(e.credits).toBe(mostExpensiveItemPrice(enemyMk(3)) - e.equipment[0]!.cost);
    expect(e.shopState).toBe('kaempfen');
    expect(e.spawnInvulnCd).toBe(5);
    expect(e.combatant.invulnerable).toBe(true);
    expect(e.prog.level).toBe(3);
  });

  it('Stats kommen aus der Ausrüstung — gleiche Basis-HP, da der Erstkauf eine Waffe (kein HP) ist', () => {
    const lo = createEnemyEntity(makeScene(), specAtLevel(1), 1, () => 0.5);
    const hi = createEnemyEntity(makeScene(), specAtLevel(9), 1, () => 0.5);
    expect(lo.combatant.maxHp).toBe(hi.combatant.maxHp); // Waffe addiert kein HP
  });
});
