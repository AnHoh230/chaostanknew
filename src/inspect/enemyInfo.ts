import { enemyMk } from '../enemy/enemyStats';

/** Schmaler struktureller Typ — koppelt enemyInfo NICHT an die volle Enemy-Klasse. */
export interface EnemyLike {
  id: string;
  displayName: string;
  level: number;
  damage: number; // Schaden pro Schuss (aus dem Level)
  speed?: number; // Tempo (vom Aufrufer; Gegner haben aktuell ein gemeinsames Tempo)
  combatant: { hp: number; maxHp: number; armor?: number; lootValue?: number; dodge?: number };
  activeBuffs?: ReadonlyArray<string>; // Labels aktiver Buffs/Debuffs (Markiert, Vernebelt, …)
}

export interface EnemyInfo {
  id: string;
  name: string;
  level: number;
  mk: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  dodge: number; // Ausweich-Chance 0..1
  speed: number;
  lootValue: number;
  boosters: string[]; // aktive Buffs/Debuffs
}

/** Eingefrorener Lese-Snapshot eines Gegners für M-Tooltip und I-Karte. */
export function buildEnemyInfo(e: EnemyLike): EnemyInfo {
  return {
    id: e.id,
    name: e.displayName,
    level: e.level,
    mk: enemyMk(e.level),
    hp: e.combatant.hp,
    maxHp: e.combatant.maxHp,
    damage: e.damage,
    armor: e.combatant.armor ?? 0,
    dodge: e.combatant.dodge ?? 0,
    speed: e.speed ?? 0,
    lootValue: e.combatant.lootValue ?? 0,
    boosters: e.activeBuffs ? [...e.activeBuffs] : [],
  };
}
