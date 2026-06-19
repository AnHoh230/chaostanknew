import { rollEnemyEquipment } from './equipment';
import { sellValue } from '../shop/buyLogic';
import type { ShopItem } from '../shop/catalog';

/** Kosten, das eigene Level (und damit die Ausrüstungs-MK) um 1 zu erhöhen. */
export function enemyUpgradeCost(level: number): number {
  return 40 + level * 30;
}

export interface EnemyShopState {
  level: number;
  credits: number;
  equipment: readonly ShopItem[];
  bag: readonly ShopItem[];
}

export interface EnemyShopResult {
  level: number;
  credits: number;
  equipment: ShopItem[];
  bag: ShopItem[];
  soldCollected: number; // verkaufte Beute-Teile (aus der Tasche)
  soldOld: number; // beim Aufrüsten eingetauschte alte Teile
  upgraded: boolean;
}

const TRADE_IN = 0.3; // Eintauschwert alter Ausrüstung beim Aufrüsten (Anteil von sellValue)

/**
 * Ein Shop-Besuch eines Gegners (rein logisch, deterministisch über rng):
 * 1. gesammelte Beute (Tasche) verkaufen → Credits.
 * 2. wenn bezahlbar: aufrüsten — Level +1, altes Gear eintauschen, frisches
 *    Gear in der neuen MK-Stufe anlegen.
 */
export function runEnemyShopVisit(s: EnemyShopState, rng: () => number): EnemyShopResult {
  let credits = s.credits;

  // 1) gesammelte Beute verkaufen
  const soldCollected = s.bag.length;
  for (const it of s.bag) credits += sellValue(it);

  // 2) aufrüsten, wenn bezahlbar
  let level = s.level;
  let equipment: ShopItem[] = [...s.equipment];
  let soldOld = 0;
  let upgraded = false;
  const cost = enemyUpgradeCost(level);
  if (level < 10 && credits >= cost) {
    credits -= cost;
    for (const it of equipment) credits += Math.round(sellValue(it) * TRADE_IN);
    soldOld = equipment.length;
    level += 1;
    equipment = rollEnemyEquipment(level, rng);
    upgraded = true;
  }

  return { level, credits, equipment, bag: [], soldCollected, soldOld, upgraded };
}
