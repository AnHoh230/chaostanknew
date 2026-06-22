/**
 * Sniper-Roster (Schicht 0): die DREI aktiven Gegner-Typen und ihre Basiswerte (Stufe 0).
 * Charakter steckt im Typ (Tempo/HP/Schaden), die Heat-Stufe skaliert alle hoch.
 *
 * - allrounder: Heat-0-Basis. Nicht sonderlich schnell, moderater Schaden, stirbt mit 1 Sniper-Schuss.
 * - racer:      schnell, fragil — schließt die Distanz, zwingt zum Umpacken/Wegfahren.
 * - bunker:     sehr langsam (langsamer als der Spieler), massig HP, massiver Schaden.
 *
 * Alte Typen (closer/flanker/swarm/disruptor/blocker) sind INAKTIV (nicht mehr im Spawn) —
 * Aufräumen offen (siehe TECH-DEBT TD-8), falls AoE/DoT den neuen Satz mittragen.
 */
export interface RosterStats {
  speed: number; // Welt-Einheiten/s (Basis, Stufe 0)
  hp: number;
  damage: number; // pro Schuss
  lootValue: number; // XP-Gewicht beim Kill
}

export const ROSTER: Record<string, RosterStats> = {
  // Spieler ist standardmäßig 12 schnell (alter Späher) → allrounder klar langsamer.
  allrounder: { speed: 8, hp: 60, damage: 14, lootValue: 0.4 },
  racer: { speed: 11, hp: 45, damage: 18, lootValue: 0.5 },
  bunker: { speed: 6, hp: 220, damage: 40, lootValue: 1.2 },
};

export interface StufeEscalation {
  hp: number; // multiplikativer Faktor PRO Heat-Stufe (Stufe s → faktor^s)
  speed: number;
  damage: number;
}

export const DEFAULT_ESCALATION: StufeEscalation = { hp: 1.4, speed: 1.12, damage: 1.35 };

/** Basiswerte eines Typs auf die aktuelle Heat-Stufe hochskalieren (Stufe 0 = unverändert). */
export function scaleStats(base: RosterStats, stufe: number, esc: StufeEscalation): RosterStats {
  const f = (factor: number): number => Math.pow(factor, Math.max(0, stufe));
  return {
    speed: +(base.speed * f(esc.speed)).toFixed(2),
    hp: Math.round(base.hp * f(esc.hp)),
    damage: Math.round(base.damage * f(esc.damage)),
    lootValue: base.lootValue, // XP-Gewicht stufen-unabhängig
  };
}
