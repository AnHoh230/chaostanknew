import type { Part } from '../loot/parts';

export type BuyResult =
  | { ok: true }
  | { ok: false; grund: 'besessen' | 'zu_teuer' };

/** Reine Kauf-Prüfung: schon besessen? genug Geld? */
export function evaluateBuy(money: number, part: Part, owned: ReadonlySet<string>): BuyResult {
  if (owned.has(part.id)) return { ok: false, grund: 'besessen' };
  if (money < part.cost) return { ok: false, grund: 'zu_teuer' };
  return { ok: true };
}
