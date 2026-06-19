import { describe, it, expect } from 'vitest';
import { createLoadout } from './loadout';
import { catalogItem } from '../shop/catalog';

const base = { damage: 20, maxHp: 100, speed: 8, armor: 0 };

describe('createLoadout (Slots + Tasche)', () => {
  it('ohne Items = Basis-Stats', () => {
    expect(createLoadout(base).stats()).toEqual(base);
  });

  it('equip summiert Stats (Waffe→Schaden, Wanne+Turm→HP)', () => {
    const l = createLoadout(base);
    l.equip(catalogItem('waffe_mk01_normal')); // 29
    l.equip(catalogItem('wanne_mk01_normal')); // 159
    l.equip(catalogItem('turm_mk01_normal')); // 113
    expect(l.stats().damage).toBe(49);
    expect(l.stats().maxHp).toBe(100 + 159 + 113);
  });

  it('neues Item im selben Slot schiebt das alte in die Tasche', () => {
    const l = createLoadout(base);
    const w1 = catalogItem('waffe_mk01_normal');
    const w2 = catalogItem('waffe_mk02_normal');
    l.equip(w1);
    l.equip(w2);
    expect(l.get('waffe')).toBe(w2);
    expect(l.bag()).toContain(w1); // altes ist in der Tasche, nicht weg
    expect(l.stats().damage).toBe(20 + 45);
  });

  it('Loot landet in der Tasche und kann von dort angelegt werden', () => {
    const l = createLoadout(base);
    const w = catalogItem('waffe_mk03_normal');
    l.addToBag(w);
    expect(l.bag()).toContain(w);
    expect(l.stats().damage).toBe(20); // noch nicht angelegt
    l.equip(w); // aus der Tasche anlegen
    expect(l.get('waffe')).toBe(w);
    expect(l.bag()).not.toContain(w); // nicht mehr in der Tasche
  });

  it('unequip legt das Slot-Item zurück in die Tasche', () => {
    const l = createLoadout(base);
    const ra = catalogItem('raeder_mk03_normal');
    l.equip(ra);
    l.unequip('raeder');
    expect(l.get('raeder')).toBeNull();
    expect(l.bag()).toContain(ra);
    expect(l.stats().speed).toBe(8);
  });

  it('remove entfernt aus Tasche ODER Slot (Verkauf)', () => {
    const l = createLoadout(base);
    const eq = catalogItem('ruestung_mk02_normal');
    const inBag = catalogItem('waffe_mk01_normal');
    l.equip(eq);
    l.addToBag(inBag);
    l.remove(eq);
    l.remove(inBag);
    expect(l.get('ruestung')).toBeNull();
    expect(l.bag()).not.toContain(inBag);
    expect(l.stats().armor).toBe(0);
  });
});
