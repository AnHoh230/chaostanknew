/**
 * Häscher = graue, zähe Vollstrecker, die der Bewegungs-Heat (siehe heatTracker) ON TOP zu den
 * normalen Spawns auf das Feld bringt. Sie geben dem Spieler NICHTS (keine Impulse/Skillpunkte/
 * XP/Erntefieber/Ult-Heilung) — reiner Anti-Exploit-Druck, kein Futter.
 *
 *  - Fährte → Häscher VORAUS (in Fahrtrichtung), man fährt in sie hinein.
 *  - Kessel → Häscher RINGS um den Spieler, enger.
 * Sie erscheinen NUR aus dem Exploit-Heat (KEIN Zeit-Sockel — beim sauberen Spiel nie welche) und
 * werden ZÄHER, je heftiger der Exploit (höherer Heat → mehr HP). Mehr Exploit = mehr UND härtere Häscher.
 *
 * Reine Funktionen (TDD); Schwellen/Stückzahlen/HP sind Drehregler.
 */
export interface HaescherCfg {
  grace: number; // s Schonfrist am Run-Anfang: davor GAR KEINE Häscher (erst etablieren)
  heatSchwelle: number; // Heat muss diese Schwelle (0..1) überschreiten, ehe es Häscher treibt
  frontProHeat: number; // Soll-Häscher voraus pro Fährte-Punkt ÜBER der Schwelle
  ringProHeat: number; // Soll-Häscher rundum pro Kessel-Punkt ÜBER der Schwelle
  maxFront: number; // Deckel voraus
  maxRing: number; // Deckel rundum
  hpBasis: number; // HP bei minimalem Heat (gerade über der Schwelle)
  hpProHeat: number; // zusätzliche HP bei vollem Heat (1.0) — Exploit-Härte
  damage: number; // Schaden pro Schuss
  speed: number; // Welt-Einheiten/s (Vollstrecker: drängt heran, nicht schnell)
}

export const DEFAULT_HAESCHER_CFG: HaescherCfg = {
  grace: 45,
  heatSchwelle: 0.4,
  frontProHeat: 5,
  ringProHeat: 5,
  maxFront: 8,
  maxRing: 10,
  hpBasis: 120,
  hpProHeat: 220,
  damage: 12,
  speed: 6,
};

export interface HaescherSoll {
  front: number; // gewünschte lebende Häscher VORAUS
  ring: number; // gewünschte lebende Häscher RINGS
}

/** Soll-Zahl lebender Häscher (voraus/rundum) — NUR aus dem Exploit-Heat, KEIN Zeit-Sockel. */
export function haescherSoll(t: number, kessel: number, faehrte: number, cfg: HaescherCfg = DEFAULT_HAESCHER_CFG): HaescherSoll {
  if (Math.max(0, t) < cfg.grace) return { front: 0, ring: 0 }; // Schonfrist: am Anfang gar keine Häscher
  // Erst Heat ÜBER der Schwelle treibt Häscher — kurzes Stehen/Geradeausfahren zählt nicht.
  const k = Math.max(0, kessel - cfg.heatSchwelle);
  const f = Math.max(0, faehrte - cfg.heatSchwelle);
  const front = Math.min(cfg.maxFront, Math.round(f * cfg.frontProHeat));
  const ring = Math.min(cfg.maxRing, Math.round(k * cfg.ringProHeat));
  return { front, ring };
}

export interface HaescherStats {
  hp: number;
  damage: number;
  speed: number;
}

/** Häscher-Stats: zäher je heftiger der Exploit (heat 0..1 = dominanter Bewegungs-Heat beim Spawn). */
export function haescherStats(heat: number, cfg: HaescherCfg = DEFAULT_HAESCHER_CFG): HaescherStats {
  const h = Math.max(0, Math.min(1, heat));
  return {
    hp: Math.round(cfg.hpBasis + cfg.hpProHeat * h),
    damage: cfg.damage,
    speed: cfg.speed,
  };
}
