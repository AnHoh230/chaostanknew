export interface EnemyStats {
  maxHp: number;
  damage: number;
  armor: number;
  dodge: number;
  lootValue: number;
}

/** Gegner-MK aus seinem Level: je 2 Level eine MK-Stufe (1..10). Steuert die
 *  Stat-Skalierung (kein Equipment mehr — Werte hängen NUR am Level). */
export function enemyMk(level: number): number {
  return Math.max(1, Math.min(10, Math.ceil(level / 2)));
}

/**
 * Gegner-Kampfwerte AUS DEM LEVEL (über die MK-Stufe). Höheres Level ⇒ zäher und
 * mehr Schaden. Kein Equipment, kein Loadout — die Stärke eines Gegners ist allein
 * eine Funktion seines Levels.
 */
export function enemyCombatStats(level: number): EnemyStats {
  const mk = enemyMk(level);
  return {
    maxHp: 60 + mk * 40,
    damage: 8 + mk * 4,
    armor: mk * 3,
    dodge: 0,
    lootValue: +(0.3 + mk * 0.3).toFixed(2),
  };
}
