import { enemyMk } from '../enemy/equipment';
import { MOTIV_LABEL } from '../ai/motives';
import type { Slot } from '../shop/catalog';

/** Schmale strukturelle Typen — koppeln enemyInfo NICHT an die volle Enemy-Klasse. */
export interface EnemyLikeItem {
  slot: Slot;
  name: string;
  damage: number;
  hp: number;
  armor: number;
  speed: number;
  autoFire?: { damage: number; range: number }; // Sekundärwaffe (Auto-Turret)
}
export interface EnemyLike {
  id: string;
  displayName: string;
  named: { archetyp: string } | null;
  motiveId: string;
  level: number;
  damage: number; // Schaden pro Schuss (aus der Ausrüstung)
  speed?: number; // Tempo (vom Aufrufer; Gegner haben aktuell ein gemeinsames Tempo)
  combatant: { hp: number; maxHp: number; armor?: number; lootValue?: number; dodge?: number };
  equipment: ReadonlyArray<EnemyLikeItem>;
  bag: ReadonlyArray<{ name: string }>;
  activeBuffs?: ReadonlyArray<string>; // Labels aktiver Buffs/Debuffs (Markiert, Vernebelt, …)
}
export interface AkteLike {
  begegnungen: number;
  siege: number;
  niederlagen: number;
  knappsterSieg: number;
}

export interface EnemyInfoEquip {
  slot: Slot;
  name: string;
  stat: string;
}
export interface EnemyInfoHistory {
  hasHistory: boolean;
  begegnungen: number;
  siege: number;
  niederlagen: number;
  knappsterSiegPct: number;
}
export interface EnemyInfo {
  id: string;
  name: string;
  isNamed: boolean;
  motiv: string;
  archetyp: string | null;
  level: number;
  mk: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  dodge: number; // Ausweich-Chance 0..1 (aus Modulen/Ausrüstung)
  speed: number;
  lootValue: number;
  equipment: EnemyInfoEquip[];
  bag: string[];
  boosters: string[]; // vorerst immer [] (kommt mit SH2)
  history: EnemyInfoHistory;
}

function statText(it: EnemyLikeItem): string {
  if (it.autoFire) return `Auto: ${it.autoFire.damage} Schaden (${it.autoFire.range} Reichw.)`;
  if (it.damage) return `${it.damage} Schaden`;
  if (it.hp) return `${it.hp} HP`;
  if (it.armor) return `${it.armor} Rüstung`;
  if (it.speed) return `${it.speed} Tempo`;
  return '';
}

/** Eingefrorener Lese-Snapshot eines Gegners für M-Tooltip und I-Karte. */
export function buildEnemyInfo(e: EnemyLike, akte: AkteLike | null): EnemyInfo {
  const hasHistory = akte !== null && akte.begegnungen > 0;
  return {
    id: e.id,
    name: e.displayName,
    isNamed: e.named !== null,
    motiv: MOTIV_LABEL[e.motiveId] ?? e.motiveId,
    archetyp: e.named ? e.named.archetyp : null,
    level: e.level,
    mk: enemyMk(e.level),
    hp: e.combatant.hp,
    maxHp: e.combatant.maxHp,
    damage: e.damage,
    armor: e.combatant.armor ?? 0,
    dodge: e.combatant.dodge ?? 0,
    speed: e.speed ?? 0,
    lootValue: e.combatant.lootValue ?? 0,
    equipment: e.equipment.map((it) => ({ slot: it.slot, name: it.name, stat: statText(it) })),
    bag: e.bag.map((it) => it.name),
    boosters: e.activeBuffs ? [...e.activeBuffs] : [],
    history: hasHistory
      ? {
          hasHistory: true,
          begegnungen: akte!.begegnungen,
          siege: akte!.siege,
          niederlagen: akte!.niederlagen,
          knappsterSiegPct: Math.round(akte!.knappsterSieg * 100),
        }
      : { hasHistory: false, begegnungen: 0, siege: 0, niederlagen: 0, knappsterSiegPct: 0 },
  };
}
