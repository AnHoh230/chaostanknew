import { enemyMk } from './equipment';
import type { ShopItem } from '../shop/catalog';

export interface EnemyStats {
  maxHp: number;
  damage: number;
  armor: number;
  dodge: number;
  lootValue: number;
}

const BASE_HP = 50; // Grund-HP eines komplett unbestückten Gegners
const BASE_DMG = 4; // Grund-Schaden ohne Waffe

/**
 * Gegner-Kampfwerte AUS DER AUSRÜSTUNG (symmetrisch zum Spieler-Loadout): Wanne/
 * Turm → HP, Waffe → Schaden, Rüstung → armor, Module → dodge. Damit fühlt sich
 * ein gut bestückter Gegner deutlich anders an als ein schwach bestückter — und
 * Loot/Kauf zahlen wirklich auf die Stärke ein. Level bestimmt nur die MK-Stufe.
 */
export function enemyCombatStats(equipment: readonly ShopItem[], level: number): EnemyStats {
  let hp = BASE_HP;
  let damage = BASE_DMG;
  let armor = 0;
  let dodge = 0;
  for (const it of equipment) {
    hp += it.hp ?? 0;
    damage += it.damage ?? 0;
    armor += it.armor ?? 0;
    dodge += it.dodge ?? 0;
  }
  return {
    maxHp: Math.round(hp),
    damage: Math.round(damage),
    armor: Math.round(armor),
    dodge,
    lootValue: +(0.3 + enemyMk(level) * 0.3).toFixed(2),
  };
}
