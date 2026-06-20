import { describe, it, expect } from 'vitest';
import { planPurchases, shouldStartShopTrip, pickBoosterToUse } from './enemyEconomy';
import { catalogItem } from '../shop/catalog';
import { boosterDef } from '../shop/boosters';

describe('planPurchases', () => {
  it('verkauft Beute und kauft max. 2 Equip-Teile für leere Slots', () => {
    const r = planPurchases({ credits: 400, equipment: [], mk: 1, bag: [], beltFree: 3 });
    expect(r.soldFromBag).toBe(0);
    expect(r.bought).toBe(2); // max 2 pro Trip
    expect(r.equipment).toHaveLength(2);
    expect(r.credits).toBeLessThan(400);
  });

  it('Beute fließt als Credits ein', () => {
    const bag = [catalogItem('waffe_mk03_selten')];
    const r = planPurchases({ credits: 0, equipment: [], mk: 1, bag, beltFree: 3 });
    expect(r.soldFromBag).toBe(1);
  });

  it('voll für MK → kauft Booster statt Equip', () => {
    const full = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung']
      .map((s) => catalogItem(`${s}_mk01_normal`));
    const r = planPurchases({ credits: 500, equipment: full, mk: 1, bag: [], beltFree: 3 });
    expect(r.bought).toBe(0);
    expect(r.boostersBought.length).toBeGreaterThan(0);
  });

  it('kein bezahlbares Teil → kein Kauf', () => {
    const r = planPurchases({ credits: 10, equipment: [], mk: 1, bag: [], beltFree: 3 });
    expect(r.bought).toBe(0);
  });
});

describe('shouldStartShopTrip', () => {
  it('genug Geld & nicht im Kampf → true', () => {
    expect(shouldStartShopTrip({ credits: 1000, mk: 1, inCombat: false })).toBe(true);
  });
  it('im Kampf → nie', () => {
    expect(shouldStartShopTrip({ credits: 1000, mk: 1, inCombat: true })).toBe(false);
  });
  it('zu wenig Geld → false', () => {
    expect(shouldStartShopTrip({ credits: 50, mk: 1, inCombat: false })).toBe(false);
  });
});

describe('pickBoosterToUse', () => {
  const heal = boosterDef('panzerhaut_schaum');
  const flee = boosterDef('notstrom_zuender');
  it('wenig HP → Heil-Booster-Index', () => {
    expect(pickBoosterToUse([flee, heal, null], { hpFrac: 0.1, inCombat: true, mode: 'feuern' })).toBe(1);
  });
  it('fliehen → Notstrom-Zünder', () => {
    expect(pickBoosterToUse([flee, null, null], { hpFrac: 0.9, inCombat: false, mode: 'fliehen' })).toBe(0);
  });
  it('nichts Passendes → -1', () => {
    expect(pickBoosterToUse([null, null, null], { hpFrac: 1, inCombat: false, mode: 'scout' })).toBe(-1);
  });
});
