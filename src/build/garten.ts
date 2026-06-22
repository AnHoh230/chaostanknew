/**
 * Garten-Build (Z-Z-Z) — reine Reife-Logik, kein Engine-Bezug (TDD).
 *
 * Der Loop: SÄEN → REIFEN lassen → ERNTEN.
 * - SÄEN: ein Schuss erhöht die Potenz. Ein einzelner Saat reift von selbst bis „reif" — kein
 *   Nachhämmern nötig (Nachsäen ist optional, treibt nur die Potenz für zähe Gegner höher).
 * - REIFEN: jeder Tick köchelt einen kleinen DoT (tötet allein nicht) und lässt die Potenz reifen
 *   (×reife). Erreicht sie die Schwelle, ist das Gift REIF (rot) — Reifen + Köcheln stoppen, es
 *   wartet (kein Verfall).
 * - ERNTEN: ein Schuss auf ein reifes Ziel löst den Erntebruch aus (Aufrufer) — der tödliche Knall.
 */
export interface GiftState {
  potency: number; // Giftstärke; wächst beim Säen und beim Reifen, bestimmt Glühen + Erntebruch
  tickCd: number; // s bis zum nächsten Tick
}

export interface GartenConfig {
  saat: number; // Grund-Potenz-Zuwachs pro Schuss
  reife: number; // Potenz-Faktor pro Tick (>1 = reift)
  tickEvery: number; // s zwischen Ticks
  tickDmg: number; // kleiner Köchel-Schaden pro Tick (DoT, tötet allein nicht)
  slow: number; // 0..1 Tempo-Drosselung vergifteter Gegner
  erntePot: number; // Potenz-Schwelle: ab hier ist das Gift reif (rot, Aura aktiv)
  // ZZZ — Aura-Kaskade. RIESIG im Welt-Maßstab (Feld ist 130+), sonst gilt nie ein Panzer als nah:
  auraRadius: number; // Welt-Radius der Reife-Aura; berühren sich zwei → Ernte
  ausbreitRadius: number; // riesiger Radius, in dem die Ernte (Tentakeln) nach Panzern greift
  dotKraftProErnte: number; // additive Dot-Stärke pro Ernte (bleibt — Spieler wird stärker)
}

export const DEFAULT_GARTEN: GartenConfig = {
  saat: 4,
  reife: 1.2,
  tickEvery: 0.5,
  tickDmg: 3,
  slow: 0.5,
  erntePot: 24,
  auraRadius: 28,
  ausbreitRadius: 80,
  dotKraftProErnte: 1,
};

/**
 * Ein Schuss sät/erneuert Gift: Grund-Potenz + die angesammelte Dot-Kraft (Buff) dazu. Kein Verfall.
 * `dotKraft` hebt frische UND nachgesäte Dots auf die aktuelle Stärke des Spielers an.
 */
export function saeGift(g: GiftState | undefined, cfg: GartenConfig, dotKraft = 0): GiftState {
  return { potency: (g?.potency ?? 0) + cfg.saat + dotKraft, tickCd: g?.tickCd ?? cfg.tickEvery };
}

/** Reif = Potenz hat die Ernteschwelle erreicht (rot, bereit für den Erntebruch). */
export function istReif(g: GiftState, cfg: GartenConfig): boolean {
  return g.potency >= cfg.erntePot;
}

/** Sichtbare Reife-Stufe 0..3 aus der Potenz (Aufrufer mappt sie auf eine Glüh-Farbe). */
export function reifeStufe(g: GiftState, cfg: GartenConfig): 0 | 1 | 2 | 3 {
  const f = g.potency / cfg.erntePot;
  if (f >= 1) return 3; // reif (rot)
  if (f >= 0.6) return 2;
  if (f >= 0.3) return 1;
  return 0;
}

/**
 * Gift um dt weiterrechnen (mutiert g). Liefert den fälligen Köchel-Schaden (0 = noch kein Tick
 * oder bereits reif). Reifes Gift köchelt/reift NICHT mehr — es wartet auf die Ernte (Schuss).
 */
export function tickGift(g: GiftState, dt: number, cfg: GartenConfig): { dmg: number } {
  g.tickCd -= dt;
  if (g.tickCd > 0) return { dmg: 0 };
  g.tickCd += cfg.tickEvery;
  if (g.potency >= cfg.erntePot) return { dmg: 0 }; // reif → wartet, kein Schaden/Reifen mehr
  g.potency *= cfg.reife; // reift weiter Richtung Ernteschwelle
  return { dmg: cfg.tickDmg }; // köchelt (kleiner DoT)
}
