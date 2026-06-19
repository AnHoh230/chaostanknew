import type { ShopItem } from './catalog';

export type BuyResult =
  | { ok: true }
  | { ok: false; grund: 'nur_normal' | 'mk_gesperrt' | 'besessen' | 'zu_teuer' };

/** Kauf-Prüfung: nur Normale, MK freigeschaltet, nicht schon verbaut, genug Geld. */
export function evaluateBuy(
  money: number,
  item: ShopItem,
  unlockedMk: number,
  isEquipped: (id: string) => boolean,
): BuyResult {
  if (item.rarity !== 'normal') return { ok: false, grund: 'nur_normal' };
  if (item.mk > unlockedMk) return { ok: false, grund: 'mk_gesperrt' };
  if (isEquipped(item.id)) return { ok: false, grund: 'besessen' };
  if (money < item.cost) return { ok: false, grund: 'zu_teuer' };
  return { ok: true };
}

/** Verkaufswert eines Items (Rückkauf zu ~50%). */
export function sellValue(item: ShopItem): number {
  return Math.round(item.cost * 0.5);
}
