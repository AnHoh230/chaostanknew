import type { ShopItem, Slot } from '../shop/catalog';

export interface BaseStats {
  damage: number;
  maxHp: number;
  speed: number;
  armor: number;
}

export interface DerivedStats {
  damage: number;
  maxHp: number;
  speed: number;
  armor: number;
}

export interface Loadout {
  /** Item in seinen Slot legen; gibt das vorher dort liegende Item zurück (oder null). */
  equip(item: ShopItem): ShopItem | null;
  unequip(slot: Slot): ShopItem | null;
  get(slot: Slot): ShopItem | null;
  owns(id: string): boolean;
  all(): ShopItem[]; // alle aktuell bestückten Items
  stats(): DerivedStats;
}

/**
 * Ein Item pro Slot. Gesamt-Stats = Klassen-Basis + Beiträge der bestückten Slots
 * (Waffe→Schaden, Wanne+Turm→HP, Räder→Tempo, Rüstung→Rüstung).
 */
export function createLoadout(base: BaseStats): Loadout {
  const slots: Partial<Record<Slot, ShopItem>> = {};

  function stats(): DerivedStats {
    return {
      damage: base.damage + (slots.waffe?.damage ?? 0),
      maxHp: base.maxHp + (slots.wanne?.hp ?? 0) + (slots.turm?.hp ?? 0),
      speed: base.speed + (slots.raeder?.speed ?? 0),
      armor: base.armor + (slots.ruestung?.armor ?? 0),
    };
  }

  return {
    equip(item) {
      const prev = slots[item.slot] ?? null;
      slots[item.slot] = item;
      return prev;
    },
    unequip(slot) {
      const prev = slots[slot] ?? null;
      delete slots[slot];
      return prev;
    },
    get: (slot) => slots[slot] ?? null,
    owns: (id) => Object.values(slots).some((it) => it.id === id),
    all: () => Object.values(slots),
    stats,
  };
}
