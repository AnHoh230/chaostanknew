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

describe('createEnemyEntity — Anfangs-Shopping-Verdrahtung', () => {
  it('spawnt nackt, mit Startgeld = teuerstes Item seiner MK, im Zustand shop_anfahrt', () => {
    const e = createEnemyEntity(makeScene(), specAtLevel(3), 1, () => 0.5);
    expect(e.equipment).toHaveLength(0); // nackt — rüstet sich am ersten Shop auf
    expect(e.prog.level).toBe(3);
    expect(e.credits).toBe(mostExpensiveItemPrice(enemyMk(3)));
    expect(e.shopState).toBe('shop_anfahrt');
    expect(e.belt.count()).toBe(0);
  });

  it('Stats kommen aus der (leeren) Ausrüstung — kein Level-basiertes HP mehr', () => {
    const lo = createEnemyEntity(makeScene(), specAtLevel(1), 1, () => 0.5);
    const hi = createEnemyEntity(makeScene(), specAtLevel(9), 1, () => 0.5);
    // Beide nackt → gleiche Basis-HP (HP hängt jetzt an Ausrüstung, nicht am Level).
    expect(lo.combatant.maxHp).toBe(hi.combatant.maxHp);
  });
});
