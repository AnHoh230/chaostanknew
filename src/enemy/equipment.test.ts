import { describe, it, expect } from 'vitest';
import { enemyMk, rollEnemyEquipment, pickDrop } from './equipment';
import { catalogItem } from '../shop/catalog';
import { createRng } from '../core/rng';

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

describe('rollEnemyEquipment', () => {
  it('legt für jeden Slot ein echtes Katalog-Item in MK = enemyMk(level) an', () => {
    const eq = rollEnemyEquipment(3, createRng(1).next); // Level 3 → MK2
    expect(eq.length).toBe(5);
    const slots = eq.map((i) => i.slot).sort();
    expect(slots).toEqual(['raeder', 'ruestung', 'turm', 'waffe', 'wanne']);
    for (const it of eq) {
      expect(it.mk).toBe(2);
      // ist ein real existierendes Katalog-Item
      expect(catalogItem(it.id).id).toBe(it.id);
    }
  });

  it('ist seed-deterministisch', () => {
    const a = rollEnemyEquipment(5, createRng(42).next).map((i) => i.id);
    const b = rollEnemyEquipment(5, createRng(42).next).map((i) => i.id);
    expect(a).toEqual(b);
  });
});

describe('pickDrop', () => {
  it('liefert genau eines der angelegten Teile', () => {
    const eq = rollEnemyEquipment(4, createRng(7).next);
    const drop = pickDrop(eq, createRng(3).next);
    expect(drop).not.toBeNull();
    expect(eq).toContain(drop);
  });
  it('leere Ausrüstung → null (kein generiertes Item)', () => {
    expect(pickDrop([], createRng(1).next)).toBeNull();
  });
});
