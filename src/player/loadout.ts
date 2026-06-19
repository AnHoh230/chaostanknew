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
  /** Item in seinen Slot legen. Kommt es aus der Tasche, wird es dort entfernt;
   *  ein bereits ausgerüstetes Item desselben Slots wandert in die Tasche. */
  equip(item: ShopItem): void;
  /** Ausgerüstetes Item eines Slots in die Tasche zurücklegen. */
  unequip(slot: Slot): void;
  /** Item (aus Tasche ODER Slot) entfernen — z. B. beim Verkauf. */
  remove(item: ShopItem): void;
  /** Item in die Tasche legen (Loot/Kauf, ohne sofort anzulegen). */
  addToBag(item: ShopItem): void;
  get(slot: Slot): ShopItem | null;
  equippedList(): ShopItem[];
  bag(): ShopItem[];
  stats(): DerivedStats;
}

/**
 * Ein Item pro Slot (ausgerüstet) + eine Tasche (Bag) für besessene, nicht
 * ausgerüstete Items. Gesamt-Stats = Klassen-Basis + ausgerüstete Slots.
 */
export function createLoadout(base: BaseStats): Loadout {
  const slots: Partial<Record<Slot, ShopItem>> = {};
  const bagArr: ShopItem[] = [];

  function dropFromBag(item: ShopItem): void {
    const i = bagArr.indexOf(item);
    if (i >= 0) bagArr.splice(i, 1);
  }

  return {
    equip(item) {
      dropFromBag(item);
      const prev = slots[item.slot];
      if (prev) bagArr.push(prev);
      slots[item.slot] = item;
    },
    unequip(slot) {
      const prev = slots[slot];
      if (prev) {
        bagArr.push(prev);
        delete slots[slot];
      }
    },
    remove(item) {
      dropFromBag(item);
      for (const s of Object.keys(slots) as Slot[]) {
        if (slots[s] === item) delete slots[s];
      }
    },
    addToBag(item) {
      bagArr.push(item);
    },
    get: (slot) => slots[slot] ?? null,
    equippedList: () => Object.values(slots),
    bag: () => [...bagArr],
    stats: () => ({
      damage: base.damage + (slots.waffe?.damage ?? 0),
      maxHp: base.maxHp + (slots.wanne?.hp ?? 0) + (slots.turm?.hp ?? 0),
      speed: base.speed + (slots.raeder?.speed ?? 0),
      armor: base.armor + (slots.ruestung?.armor ?? 0),
    }),
  };
}
