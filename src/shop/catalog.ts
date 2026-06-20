import type { SocketName } from '../tank/sockets';
import type { BaseItem } from './itemTypes';

export type Slot = 'ruestung' | 'raeder' | 'waffe' | 'wanne' | 'turm' | 'sekundaer';
/** Slots, deren Items aus den MK-Formeln generiert werden (ohne Sonderfälle). */
export type FormulaSlot = Exclude<Slot, 'sekundaer'>;
export type Rarity = 'normal' | 'selten';

/** Auto-Feuer-Daten einer Sekundärwaffe (Auto-Turret). */
export interface AutoFireSpec {
  fireInterval: number;
  damage: number;
  range: number;
  accuracy: number; // 0..1 — streut die Schussrichtung (manuelles Feuer ignoriert dies)
}

/** Ein Ausrüstungs-Item aus dem MK-Katalog. Genau ein Hauptwert ist > 0.
 *  Erbt id/name/cost/kind/buyer/category aus BaseItem (kind immer 'equip'). */
export interface ShopItem extends BaseItem {
  slot: Slot;
  rarity: Rarity;
  mk: number;
  damage: number;
  hp: number;
  armor: number;
  speed: number;
  autoFire?: AutoFireSpec; // nur Sekundärwaffen
  dodge?: number; // Ausweich-Bonus (Module)
}

/** Slot → sichtbarer Socket (Primitive bis M8). Rüstung hat noch kein Mesh. */
export const SLOT_SOCKET: Record<Slot, { socket: SocketName; variant: string } | null> = {
  waffe: { socket: 'weapon', variant: 'g_long' },
  wanne: { socket: 'chassis', variant: 'c_wide' },
  turm: { socket: 'turret', variant: 't_big' },
  raeder: { socket: 'wheels', variant: 'w_tread' },
  ruestung: null,
  sekundaer: null, // Auto-Turret — noch kein eigenes Mesh (kommt mit Assets)
};

interface SlotDef {
  slot: FormulaSlot;
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

/** Flavor-Namen aus der Item-Datei: je MK ein Paar [normal, selten] (Index 0 = MK1). */
const NAMES: Record<FormulaSlot, [string, string][]> = {
  ruestung: [
    ['MK1 Feldblech', 'MK1 Geätztes Feldblech'],
    ['MK2 Stahlmantel', 'MK2 Verdichteter Stahlmantel'],
    ['MK3 Frontplatte', 'MK3 Rückprall-Frontplatte'],
    ['MK4 Grabenpanzerung', 'MK4 Granitkern-Grabenpanzerung'],
    ['MK5 Bollwerkplatten', 'MK5 Bollwerkplatten des Widerstands'],
    ['MK6 Eisenwall', 'MK6 Eisenwall mit Reaktivkern'],
    ['MK7 Schildmantel', 'MK7 Schildmantel der Abweisung'],
    ['MK8 Sturmbastion', 'MK8 Sturmbastion mit Schockschicht'],
    ['MK9 Titanfront', 'MK9 Titanfront der Härte'],
    ['MK10 Festungsstahl', 'MK10 Festungsstahl Primus'],
  ],
  raeder: [
    ['MK1 Werkstattrollen', 'MK1 Werkstattrollen mit Schnellkupplung'],
    ['MK2 Spurläufer', 'MK2 Spurläufer mit Zugkern'],
    ['MK3 Staubräder', 'MK3 Staubräder der Eile'],
    ['MK4 Geländekranz', 'MK4 Geländekranz mit Boostventil'],
    ['MK5 Kettenläufer', 'MK5 Kettenläufer mit Turboschub'],
    ['MK6 Sprintachsen', 'MK6 Sprintachsen des Durchbruchs'],
    ['MK7 Wüstenlaufwerk', 'MK7 Wüstenlaufwerk mit Driftkern'],
    ['MK8 Sturmrollen', 'MK8 Sturmrollen mit Nachbrenner'],
    ['MK9 Blitzkranz', 'MK9 Blitzkranz der Überfahrt'],
    ['MK10 Hyperlaufwerk', 'MK10 Hyperlaufwerk Nullspur'],
  ],
  waffe: [
    ['MK1 Kurzrohr 37', 'MK1 Kurzrohr 37 Präzision'],
    ['MK2 Grabenkanone', 'MK2 Grabenkanone mit Tiefschlag'],
    ['MK3 Stahlzahn', 'MK3 Stahlzahn Splitterkern'],
    ['MK4 Brecherrohr', 'MK4 Brecherrohr Durchschlag'],
    ['MK5 Donnerlanze', 'MK5 Donnerlanze Überdruck'],
    ['MK6 Belagerer', 'MK6 Belagerer mit Glutladung'],
    ['MK7 Schwerer Richter', 'MK7 Schwerer Richter Richtkern'],
    ['MK8 Vulkanrohr', 'MK8 Vulkanrohr Brandherz'],
    ['MK9 Titanbrecher', 'MK9 Titanbrecher Hohlladung'],
    ['MK10 Endkaliber', 'MK10 Endkaliber Omega'],
  ],
  wanne: [
    ['MK1 Spähwanne', 'MK1 Spähwanne mit Notdichtung'],
    ['MK2 Gusswanne', 'MK2 Gusswanne mit Innenstreben'],
    ['MK3 Frontwanne', 'MK3 Frontwanne Verbundkern'],
    ['MK4 Trägerwanne', 'MK4 Trägerwanne Stabil'],
    ['MK5 Bunkerwanne', 'MK5 Bunkerwanne mit Panzerzellen'],
    ['MK6 Mammutwanne', 'MK6 Mammutwanne Lebensader'],
    ['MK7 Kommandowanne', 'MK7 Kommandowanne Sicherraum'],
    ['MK8 Stahlkoloss', 'MK8 Stahlkoloss mit Notsystem'],
    ['MK9 Titanrumpf', 'MK9 Titanrumpf Autodichtung'],
    ['MK10 Kriegsarche', 'MK10 Kriegsarche Letzter Halt'],
  ],
  turm: [
    ['MK1 Wachturm', 'MK1 Wachturm mit Schnellring'],
    ['MK2 Drehkranz', 'MK2 Drehkranz Präzise'],
    ['MK3 Schützenturm', 'MK3 Schützenturm Adlerblick'],
    ['MK4 Kuppelturm', 'MK4 Kuppelturm Stabilisiert'],
    ['MK5 Sturmturm', 'MK5 Sturmturm Richtfokus'],
    ['MK6 Kommandoturm', 'MK6 Kommandoturm Signalnetz'],
    ['MK7 Falkenturm', 'MK7 Falkenturm Zielblick'],
    ['MK8 Belagerungsturm', 'MK8 Belagerungsturm Ruhige Hand'],
    ['MK9 Titanhaube', 'MK9 Titanhaube Fokuslinse'],
    ['MK10 Zitadellenturm', 'MK10 Zitadellenturm Vollvisier'],
  ],
};

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
          kind: 'equip',
          buyer: 'both',
          category: 'equipment',
          slot: s.slot,
          rarity,
          mk,
          name: NAMES[s.slot][mk - 1]![rarity === 'normal' ? 0 : 1],
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

/** Sekundärwaffen (Auto-Turrets): feuern autonom auf das nächste Ziel, mit
 *  Treffsicherheit (accuracy). Credit-Sink für Spieler UND Gegner (buyer: both). */
const AUTO_TURRETS: ShopItem[] = [
  {
    id: 'autoturret_mk02', kind: 'equip', buyer: 'both', category: 'equipment',
    slot: 'sekundaer', rarity: 'normal', mk: 2, name: 'MK2 Koaxial-MG', cost: 520,
    damage: 0, hp: 0, armor: 0, speed: 0,
    autoFire: { fireInterval: 1.4, damage: 9, range: 26, accuracy: 0.75 },
  },
  {
    id: 'autoturret_mk05', kind: 'equip', buyer: 'both', category: 'equipment',
    slot: 'sekundaer', rarity: 'normal', mk: 5, name: 'MK5 Raketenwerfer', cost: 1280,
    damage: 0, hp: 0, armor: 0, speed: 0,
    autoFire: { fireInterval: 1.1, damage: 16, range: 30, accuracy: 0.82 },
  },
  {
    id: 'autoturret_mk08', kind: 'equip', buyer: 'both', category: 'equipment',
    slot: 'sekundaer', rarity: 'normal', mk: 8, name: 'MK8 Störkanone', cost: 2600,
    damage: 0, hp: 0, armor: 0, speed: 0,
    autoFire: { fireInterval: 0.9, damage: 24, range: 34, accuracy: 0.9 },
  },
];

export const CATALOG: readonly ShopItem[] = [...buildCatalog(), ...AUTO_TURRETS];

export function catalogItem(id: string): ShopItem {
  const it = CATALOG.find((x) => x.id === id);
  if (!it) throw new Error('Unbekanntes Item: ' + id);
  return it;
}

/**
 * Eigene Instanz eines Items für den Besitz (Kauf/Loot). KATALOG-Items sind
 * geteilte Singletons — würde man sie direkt in Slot UND Tasche legen, zeigten
 * beide auf dasselbe Objekt, und ein Verkauf der einen Kopie löschte die andere.
 * Darum: beim Erwerb klonen, damit jedes besessene Teil ein eigenes Objekt ist.
 */
export function cloneItem(it: ShopItem): ShopItem {
  return { ...it };
}

/** Teuerstes Normal-Equip einer MK (über die 5 Formel-Slots). Startgeld-Basis. */
export function mostExpensiveItemPrice(mk: number): number {
  return Math.max(...SLOTS.map((s) => s.prices[mk - 1]!));
}

/** Billigstes Normal-Equip einer MK. */
export function cheapestItemPrice(mk: number): number {
  return Math.min(...SLOTS.map((s) => s.prices[mk - 1]!));
}

/** Alle Katalog-Items eines Slots in einer MK (normal + selten). */
export function itemsForSlotMk(slot: Slot, mk: number): ShopItem[] {
  return CATALOG.filter((it) => it.slot === slot && it.mk === mk);
}
