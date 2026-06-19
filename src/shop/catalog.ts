import type { SocketName } from '../tank/sockets';

export type Slot = 'ruestung' | 'raeder' | 'waffe' | 'wanne' | 'turm';
export type Rarity = 'normal' | 'selten';

/** Ein Ausrüstungs-Item aus dem MK-Katalog. Genau ein Hauptwert ist > 0. */
export interface ShopItem {
  id: string;
  slot: Slot;
  rarity: Rarity;
  mk: number;
  name: string;
  cost: number;
  damage: number;
  hp: number;
  armor: number;
  speed: number;
}

/** Slot → sichtbarer Socket (Primitive bis M8). Rüstung hat noch kein Mesh. */
export const SLOT_SOCKET: Record<Slot, { socket: SocketName; variant: string } | null> = {
  waffe: { socket: 'weapon', variant: 'g_long' },
  wanne: { socket: 'chassis', variant: 'c_wide' },
  turm: { socket: 'turret', variant: 't_big' },
  raeder: { socket: 'wheels', variant: 'w_tread' },
  ruestung: null,
};

interface SlotDef {
  slot: Slot;
  label: string;
  stat: 'armor' | 'speed' | 'damage' | 'hp';
  f: (mk: number) => number; // Normalwert-Formel
  prices: number[]; // Normalpreise MK1..MK10 (aus der Item-Datei)
}

const SLOTS: SlotDef[] = [
  { slot: 'ruestung', label: 'Rüstung', stat: 'armor', f: (mk) => 35 + 20 * mk + 4 * mk * mk,
    prices: [108, 262, 457, 690, 962, 1271, 1618, 2002, 2424, 2882] },
  { slot: 'raeder', label: 'Räder', stat: 'speed', f: (mk) => 7.5 + 1.35 * mk + 0.12 * mk * mk,
    prices: [88, 216, 381, 584, 823, 1099, 1412, 1761, 2146, 2568] },
  { slot: 'waffe', label: 'Waffe', stat: 'damage', f: (mk) => 18 + 9 * mk + 2.2 * mk * mk,
    prices: [138, 340, 591, 887, 1226, 1607, 2029, 2491, 2993, 3535] },
  { slot: 'wanne', label: 'Wanne', stat: 'hp', f: (mk) => 110 + 42 * mk + 7 * mk * mk,
    prices: [128, 311, 539, 808, 1117, 1466, 1855, 2281, 2747, 3250] },
  { slot: 'turm', label: 'Turm', stat: 'hp', f: (mk) => 80 + 28 * mk + 5 * mk * mk,
    prices: [118, 286, 497, 747, 1037, 1366, 1732, 2137, 2579, 3059] },
];

function buildCatalog(): ShopItem[] {
  const items: ShopItem[] = [];
  for (const s of SLOTS) {
    for (let mk = 1; mk <= 10; mk++) {
      for (const rarity of ['normal', 'selten'] as Rarity[]) {
        const base = s.f(mk);
        const primary = rarity === 'selten' ? base * 1.15 : base;
        const val = s.stat === 'speed' ? Math.round(primary * 100) / 100 : Math.round(primary);
        const normalCost = s.prices[mk - 1]!;
        const cost = rarity === 'selten' ? Math.round(normalCost * 1.65) : normalCost;
        items.push({
          id: `${s.slot}_mk${String(mk).padStart(2, '0')}_${rarity}`,
          slot: s.slot,
          rarity,
          mk,
          name: `MK${mk} ${s.label}${rarity === 'selten' ? ' · selten' : ''}`,
          cost,
          damage: s.stat === 'damage' ? val : 0,
          hp: s.stat === 'hp' ? val : 0,
          armor: s.stat === 'armor' ? val : 0,
          speed: s.stat === 'speed' ? val : 0,
        });
      }
    }
  }
  return items;
}

export const CATALOG: readonly ShopItem[] = buildCatalog();

export function catalogItem(id: string): ShopItem {
  const it = CATALOG.find((x) => x.id === id);
  if (!it) throw new Error('Unbekanntes Item: ' + id);
  return it;
}
