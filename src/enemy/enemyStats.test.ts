import { describe, it, expect } from 'vitest';
import { enemyCombatStats } from './enemyStats';
import { rollEnemyEquipment } from './equipment';
import { catalogItem } from '../shop/catalog';
import { createRng } from '../core/rng';

describe('enemyCombatStats', () => {
  it('leitet HP/Schaden/Rüstung aus der Ausrüstung ab', () => {
    const eq = [
      catalogItem('wanne_mk01_normal'), // hp 159
      catalogItem('turm_mk01_normal'), // hp 113
      catalogItem('waffe_mk01_normal'), // damage 29
      catalogItem('ruestung_mk01_normal'), // armor 59
    ];
    const s = enemyCombatStats(eq, 1);
    expect(s.maxHp).toBe(50 + 159 + 113);
    expect(s.damage).toBe(4 + 29);
    expect(s.armor).toBe(59);
  });

  it('MK5-Ausrüstung macht einen Gegner DEUTLICH stärker als MK1', () => {
    const mk1 = enemyCombatStats(rollEnemyEquipment(1, createRng(1).next), 1);
    const mk5 = enemyCombatStats(
      ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'].map((s) => catalogItem(`${s}_mk05_normal`)),
      9,
    );
    expect(mk5.maxHp).toBeGreaterThan(mk1.maxHp * 2);
    expect(mk5.damage).toBeGreaterThan(mk1.damage * 2);
    expect(mk5.armor).toBeGreaterThan(mk1.armor * 2);
  });

  it('unbestückt = nur Grundwerte', () => {
    const s = enemyCombatStats([], 1);
    expect(s.maxHp).toBe(50);
    expect(s.damage).toBe(4);
    expect(s.armor).toBe(0);
  });
});
