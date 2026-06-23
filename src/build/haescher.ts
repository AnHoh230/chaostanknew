/**
 * Häscher = graue, zähe Vollstrecker, die der Bewegungs-Heat (siehe heatTracker) ON TOP zu den
 * normalen Spawns auf das Feld bringt. Sie geben dem Spieler NICHTS (keine Impulse/Skillpunkte/
 * Erntefieber/Ult-Heilung/XP) — reiner Druck, kein Futter. Der ZZZ-Build liebt Masse, also dienen
 * sie als zusätzliche Körper für die Seuche, ohne den Exploit über die Belohnung zu füttern.
 *
 *  - Fährte → Häscher VORAUS (in Fahrtrichtung), man fährt in sie hinein.
 *  - Kessel → Häscher RINGS um den Spieler, enger.
 *  - Grundpegel über die Laufzeit: auch ohne Heat werden sie mit der Zeit mehr und zäher.
 *
 * Reine Funktionen (TDD); Sekunden/Stückzahlen/HP sind Drehregler.
 */
export interface HaescherCfg {
  frontProHeat: number; // Soll-Häscher voraus pro Fährte-Punkt (faehrte 0..1)
  ringProHeat: number; // Soll-Häscher rundum pro Kessel-Punkt (kessel 0..1)
  sekProGrund: number; // s Laufzeit je Grund-Häscher (zeitlicher Sockel, kommt rundum dazu)
  maxFront: number; // Deckel voraus
  maxRing: number; // Deckel rundum
  hpBasis: number; // HP eines Häschers bei t=0 (zäh)
  hpProMin: number; // zusätzliche HP je Minute Laufzeit
  damage: number; // Schaden pro Schuss
  speed: number; // Welt-Einheiten/s (Vollstrecker: drängt heran, nicht schnell)
}

export const DEFAULT_HAESCHER_CFG: HaescherCfg = {
  frontProHeat: 5,
  ringProHeat: 5,
  sekProGrund: 90,
  maxFront: 8,
  maxRing: 10,
  hpBasis: 120,
  hpProMin: 25,
  damage: 12,
  speed: 6,
};

export interface HaescherSoll {
  front: number; // gewünschte lebende Häscher VORAUS
  ring: number; // gewünschte lebende Häscher RINGS
}

/** Soll-Zahl lebender Häscher (voraus/rundum) aus Laufzeit + Heat. */
export function haescherSoll(t: number, kessel: number, faehrte: number, cfg: HaescherCfg = DEFAULT_HAESCHER_CFG): HaescherSoll {
  const grund = Math.floor(Math.max(0, t) / cfg.sekProGrund); // zeitlicher Sockel (rundum)
  const front = Math.min(cfg.maxFront, Math.round(Math.max(0, faehrte) * cfg.frontProHeat));
  const ring = Math.min(cfg.maxRing, grund + Math.round(Math.max(0, kessel) * cfg.ringProHeat));
  return { front, ring };
}

export interface HaescherStats {
  hp: number;
  damage: number;
  speed: number;
}

/** Häscher-Stats: zäh und mit der Laufzeit zunehmend zäher. */
export function haescherStats(t: number, cfg: HaescherCfg = DEFAULT_HAESCHER_CFG): HaescherStats {
  return {
    hp: Math.round(cfg.hpBasis + cfg.hpProMin * (Math.max(0, t) / 60)),
    damage: cfg.damage,
    speed: cfg.speed,
  };
}
