import { catalogItem, type ShopItem, type Slot, type Rarity } from '../shop/catalog';

/** Gegner-MK aus seinem Level: je 2 Level eine MK-Stufe (1..10). So passt das
 *  gedroppte Teil zum Gegner — kein "MK2-Loot von einem Nicht-MK2-Panzer". */
export function enemyMk(level: number): number {
  return Math.max(1, Math.min(10, Math.ceil(level / 2)));
}

const EQUIP_SLOTS: Slot[] = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'];

/** Echte Ausrüstung des Gegners: ein Katalog-Item je Slot in seiner MK-Stufe.
 *  Gelegentlich (15 %) ein seltenes Teil. Genau diese Teile kann er droppen. */
export function rollEnemyEquipment(level: number, rng: () => number): ShopItem[] {
  const mk = enemyMk(level);
  const mkStr = String(mk).padStart(2, '0');
  return EQUIP_SLOTS.map((slot) => {
    const rarity: Rarity = rng() < 0.15 ? 'selten' : 'normal';
    return catalogItem(`${slot}_mk${mkStr}_${rarity}`);
  });
}

/** Genau EIN tatsächlich angelegtes Teil als Beute — niemals generierter Loot. */
export function pickDrop(equipment: readonly ShopItem[], rng: () => number): ShopItem | null {
  if (equipment.length === 0) return null;
  return equipment[Math.floor(rng() * equipment.length)] ?? null;
}
