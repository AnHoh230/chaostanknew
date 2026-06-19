import { describe, it, expect } from 'vitest';
import { createLoadout } from './loadout';
import { catalogItem } from '../shop/catalog';

const base = { damage: 20, maxHp: 100, speed: 8, armor: 0 };

describe('createLoadout', () => {
  it('ohne Items = Basis-Stats', () => {
    expect(createLoadout(base).stats()).toEqual(base);
  });

  it('Waffe erhöht Schaden, Wanne+Turm summieren HP', () => {
    const l = createLoadout(base);
    l.equip(catalogItem('waffe_mk01_normal')); // damage 29
    l.equip(catalogItem('wanne_mk01_normal')); // hp 159
    l.equip(catalogItem('turm_mk01_normal')); // hp 113
    const s = l.stats();
    expect(s.damage).toBe(20 + 29);
    expect(s.maxHp).toBe(100 + 159 + 113);
  });

  it('neues Item im selben Slot ersetzt (gibt altes zurück)', () => {
    const l = createLoadout(base);
    l.equip(catalogItem('waffe_mk01_normal'));
    const prev = l.equip(catalogItem('waffe_mk02_normal')); // damage 45
    expect(prev?.id).toBe('waffe_mk01_normal');
    expect(l.stats().damage).toBe(20 + 45); // nur das neue zählt
  });

  it('owns kennt nur aktuell bestückte Items; unequip entfernt', () => {
    const l = createLoadout(base);
    l.equip(catalogItem('raeder_mk03_normal'));
    expect(l.owns('raeder_mk03_normal')).toBe(true);
    l.unequip('raeder');
    expect(l.owns('raeder_mk03_normal')).toBe(false);
    expect(l.stats().speed).toBe(8);
  });
});
