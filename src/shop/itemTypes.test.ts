import { describe, it, expect } from 'vitest';
import { canBuy, itemsForCategory, type BaseItem } from './itemTypes';

const mk = (id: string, buyer: BaseItem['buyer'], category: BaseItem['category']): BaseItem => ({
  id, name: id, kind: 'equip', buyer, category, cost: 100,
});

describe('canBuy', () => {
  it('player-Item: nur Spieler', () => {
    const it = mk('a', 'player', 'equipment');
    expect(canBuy(it, 'player')).toBe(true);
    expect(canBuy(it, 'enemy')).toBe(false);
  });
  it('enemy-Item: nur Gegner', () => {
    const it = mk('b', 'enemy', 'equipment');
    expect(canBuy(it, 'enemy')).toBe(true);
    expect(canBuy(it, 'player')).toBe(false);
  });
  it('both: beide', () => {
    const it = mk('c', 'both', 'equipment');
    expect(canBuy(it, 'player')).toBe(true);
    expect(canBuy(it, 'enemy')).toBe(true);
  });
});

describe('itemsForCategory', () => {
  it('filtert nach Kategorie', () => {
    const items = [mk('a', 'both', 'equipment'), mk('b', 'player', 'instant'), mk('c', 'both', 'equipment')];
    expect(itemsForCategory(items, 'equipment').map((i) => i.id)).toEqual(['a', 'c']);
    expect(itemsForCategory(items, 'instant').map((i) => i.id)).toEqual(['b']);
    expect(itemsForCategory(items, 'garage')).toEqual([]);
  });
});
