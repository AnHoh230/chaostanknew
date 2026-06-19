import { describe, it, expect } from 'vitest';
import { runEnemyShopVisit, enemyUpgradeCost } from './enemyShopping';
import { rollEnemyEquipment } from './equipment';
import { catalogItem } from '../shop/catalog';
import { sellValue } from '../shop/buyLogic';
import { createRng } from '../core/rng';

describe('runEnemyShopVisit', () => {
  it('verkauft gesammelte Beute: Credits steigen, Tasche wird geleert', () => {
    const bag = [catalogItem('waffe_mk01_normal'), catalogItem('turm_mk02_normal')];
    const refund = sellValue(bag[0]!) + sellValue(bag[1]!); // 212
    const eq = rollEnemyEquipment(9, createRng(1).next);
    // Level 9: Upgrade-Kosten (310) > Verkaufserlös (212) → nur Beute verkaufen
    const res = runEnemyShopVisit({ level: 9, credits: 0, equipment: eq, bag }, createRng(2).next);
    expect(res.soldCollected).toBe(2);
    expect(res.bag).toEqual([]);
    expect(res.credits).toBe(refund);
    expect(res.upgraded).toBe(false);
  });

  it('rüstet auf, wenn bezahlbar: Level +1, frisches Gear in neuer MK, altes eingetauscht', () => {
    const eq = rollEnemyEquipment(1, createRng(1).next); // MK1
    const res = runEnemyShopVisit(
      { level: 1, credits: 500, equipment: eq, bag: [] },
      createRng(3).next,
    );
    expect(res.upgraded).toBe(true);
    expect(res.level).toBe(2);
    expect(res.soldOld).toBe(eq.length);
    // neues Gear passt zur neuen Stufe (Level 2 → MK1 laut enemyMk)
    expect(res.equipment.every((i) => i.mk === 1)).toBe(true);
    expect(res.equipment.length).toBe(5);
  });

  it('kein Upgrade bei Level 10 (Maximum)', () => {
    const eq = rollEnemyEquipment(20, createRng(1).next);
    const res = runEnemyShopVisit(
      { level: 10, credits: 99999, equipment: eq, bag: [] },
      createRng(4).next,
    );
    expect(res.upgraded).toBe(false);
    expect(res.level).toBe(10);
  });

  it('Upgrade-Kosten steigen mit dem Level', () => {
    expect(enemyUpgradeCost(1)).toBe(70);
    expect(enemyUpgradeCost(5)).toBe(190);
    expect(enemyUpgradeCost(1)).toBeLessThan(enemyUpgradeCost(2));
  });
});
