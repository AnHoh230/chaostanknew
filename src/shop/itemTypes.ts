/** Wer darf ein Item kaufen: nur der Spieler, nur Gegner, oder beide. */
export type Buyer = 'player' | 'enemy' | 'both';

/** Grob-Typ eines Shop-Items (steuert Verarbeitung, nicht die Anzeige-Kategorie). */
export type ItemKind = 'equip' | 'consumable' | 'service' | 'contract' | 'garage';

/** Anzeige-Reiter im Shop. */
export type Category = 'equipment' | 'instant' | 'usables' | 'garage' | 'nemesis' | 'contracts';

/** Gemeinsame Basis aller Shop-Items (Ausrüstung, Booster, Dienste, …). */
export interface BaseItem {
  id: string;
  name: string;
  kind: ItemKind;
  buyer: Buyer;
  category: Category;
  cost: number;
}

/** Darf `who` (Spieler/Gegner) dieses Item kaufen? */
export function canBuy(item: { buyer: Buyer }, who: 'player' | 'enemy'): boolean {
  return item.buyer === who || item.buyer === 'both';
}

/** Items einer Anzeige-Kategorie (für die Reiter). */
export function itemsForCategory<T extends { category: Category }>(
  items: readonly T[],
  cat: Category,
): T[] {
  return items.filter((i) => i.category === cat);
}
