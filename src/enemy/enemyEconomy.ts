import {
  cloneItem, itemsForSlotMk, cheapestItemPrice, type ShopItem, type Slot,
} from '../shop/catalog';
import { sellValue } from '../shop/buyLogic';
import { BOOSTERS, type BoosterDef } from '../shop/boosters';

const EQUIP_SLOTS: Slot[] = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'];
const MAX_BUYS_PER_TRIP = 2;

export interface EnemyBuyState {
  credits: number;
  equipment: readonly ShopItem[]; // angelegt, je Slot max 1
  mk: number;
  bag: readonly ShopItem[];
  beltFree: number;
}
export interface EnemyBuyResult {
  credits: number;
  equipment: ShopItem[];
  boostersBought: BoosterDef[];
  soldFromBag: number;
  bought: number;
}

/** Bestes bezahlbares Normal-Equip eines Slots in der MK (höchster Preis ≤ Budget). */
function bestAffordableForSlot(slot: Slot, mk: number, budget: number): ShopItem | null {
  let best: ShopItem | null = null;
  for (const it of itemsForSlotMk(slot, mk)) {
    if (it.rarity !== 'normal') continue;
    if (it.cost <= budget && (!best || it.cost > best.cost)) best = it;
  }
  return best;
}

function weakestSlot(equipped: Map<Slot, ShopItem>): Slot {
  for (const s of EQUIP_SLOTS) if (!equipped.has(s)) return s; // leer zuerst
  let weakest = EQUIP_SLOTS[0]!;
  for (const s of EQUIP_SLOTS) {
    if (equipped.get(s)!.cost < equipped.get(weakest)!.cost) weakest = s;
  }
  return weakest;
}

function fullyEquippedForMk(equipped: Map<Slot, ShopItem>, mk: number): boolean {
  return EQUIP_SLOTS.every((s) => {
    const it = equipped.get(s);
    return it != null && it.mk >= mk;
  });
}

/**
 * Ein Shop-Besuch eines Gegners (rein): Beute verkaufen → bis zu 2 Equip-Teile für
 * den schwächsten/leeren Slot kaufen → wenn voll für seine MK, Booster in den Gürtel.
 */
export function planPurchases(s: EnemyBuyState): EnemyBuyResult {
  let credits = s.credits;
  const soldFromBag = s.bag.length;
  for (const it of s.bag) credits += sellValue(it);

  const equipped = new Map<Slot, ShopItem>();
  for (const it of s.equipment) equipped.set(it.slot, it);

  let bought = 0;
  while (bought < MAX_BUYS_PER_TRIP && !fullyEquippedForMk(equipped, s.mk)) {
    const slot = weakestSlot(equipped);
    const item = bestAffordableForSlot(slot, s.mk, credits);
    if (!item) break;
    const cur = equipped.get(slot);
    if (cur && item.cost <= cur.cost) break; // verbessert nichts
    credits -= item.cost;
    equipped.set(slot, cloneItem(item));
    bought++;
  }

  const boostersBought: BoosterDef[] = [];
  if (fullyEquippedForMk(equipped, s.mk)) {
    let free = s.beltFree;
    const buyable = BOOSTERS
      .filter((b) => b.buyer === 'both' || b.buyer === 'enemy')
      .slice()
      .sort((a, b) => a.cost - b.cost);
    for (const b of buyable) {
      if (free <= 0) break;
      if (credits < b.cost) continue;
      credits -= b.cost;
      boostersBought.push(b);
      free--;
    }
  }

  const equipment = EQUIP_SLOTS.filter((s2) => equipped.has(s2)).map((s2) => equipped.get(s2)!);
  return { credits, equipment, boostersBought, soldFromBag, bought };
}

export interface ShopTripCtx { credits: number; mk: number; inCombat: boolean; }
/** Trip nur starten, wenn genug für ~2 Items UND gerade nicht im Kampf. */
export function shouldStartShopTrip(c: ShopTripCtx): boolean {
  if (c.inCombat) return false;
  return c.credits >= 2 * cheapestItemPrice(c.mk);
}

export interface UseCtx { hpFrac: number; inCombat: boolean; mode: string; }
/** Index des zu zündenden Gürtel-Slots oder -1 (Einsatz-KI nach HP/Modus). */
export function pickBoosterToUse(belt: readonly (BoosterDef | null)[], ctx: UseCtx): number {
  const find = (id: string) => belt.findIndex((b) => b?.id === id);
  if (ctx.hpFrac < 0.25) {
    const i = find('panzerhaut_schaum'); if (i >= 0) return i;
    const j = find('letzte_schicht'); if (j >= 0) return j;
  }
  if (ctx.mode === 'fliehen') {
    const i = find('notstrom_zuender'); if (i >= 0) return i;
  }
  if (ctx.inCombat) {
    const i = find('ueberdruck_munition'); if (i >= 0) return i;
    const j = find('kuehlmittel_injektion'); if (j >= 0) return j;
  }
  return -1;
}
