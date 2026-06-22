import { describe, it, expect } from 'vitest';
import { enemyCombatStats, enemyMk } from './enemyStats';

describe('enemyMk', () => {
  it('koppelt MK an das Level: je 2 Level eine MK-Stufe', () => {
    expect(enemyMk(1)).toBe(1);
    expect(enemyMk(2)).toBe(1);
    expect(enemyMk(3)).toBe(2);
    expect(enemyMk(4)).toBe(2);
    expect(enemyMk(5)).toBe(3);
  });
  it('bleibt im gültigen MK-Bereich 1..10', () => {
    expect(enemyMk(0)).toBe(1);
    expect(enemyMk(99)).toBe(10);
  });
});

describe('enemyCombatStats', () => {
  it('leitet alle Werte allein aus dem Level (über MK) ab', () => {
    const s = enemyCombatStats(1); // MK1
    expect(s.maxHp).toBe(60 + 1 * 40);
    expect(s.damage).toBe(8 + 1 * 4);
    expect(s.armor).toBe(1 * 3);
    expect(s.dodge).toBe(0);
    expect(s.lootValue).toBe(0.6);
  });

  it('höheres Level = zäher + mehr Schaden + mehr Rüstung', () => {
    const lo = enemyCombatStats(1); // MK1
    const hi = enemyCombatStats(9); // MK5
    expect(hi.maxHp).toBeGreaterThan(lo.maxHp);
    expect(hi.damage).toBeGreaterThan(lo.damage);
    expect(hi.armor).toBeGreaterThan(lo.armor);
    expect(hi.lootValue).toBeGreaterThan(lo.lootValue);
  });

  it('skaliert monoton über die MK-Stufen', () => {
    const mk1 = enemyCombatStats(1);
    const mk10 = enemyCombatStats(20); // MK10
    expect(mk10.maxHp).toBeGreaterThan(mk1.maxHp * 2);
    expect(mk10.damage).toBeGreaterThan(mk1.damage * 2);
  });
});
