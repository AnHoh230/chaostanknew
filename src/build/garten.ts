/**
 * Garten-Build (Z-Z-Z) — als KRANKHEIT. Reine Gift-Logik, kein Engine-Bezug (TDD).
 *
 * Das Bild: eine Seuche, die sich über das Feld frisst.
 * - Z  — INFEKTION: ein Schuss sät Gift. Der Panzer wird sofort langsamer (Verlangsamung).
 * - ZZ — ANSTECKUNG + REIFUNG: das Gift reift pro Tick (Potenz ×reife) und drosselt dabei immer
 *   stärker. Infizierte stecken nahe Gesunde an (Ansteckung — räumlich, das macht der Aufrufer).
 * - Reif: erreicht die Potenz die Schwelle, STEHT der Panzer (Tempo 0), raucht, ist sichtbar krank.
 *   Das Gift wird tödlich (reifDmg) und frisst ihn auf — der Spieler schießt ihn NICHT ab.
 * - ZZZ — ERNTE: stirbt ein REIFER Panzer am Gift, bekommt der Spieler „Erntefieber" (Aufrufer).
 *   Jeder Erntefieber-Punkt macht NUR das reife Gift tödlicher (dmgProFieber) — reife sterben
 *   schneller, also häufiger Ernten. Inkubation/Säen bleiben unberührt. So trägt sich die Seuche.
 */
export interface GiftState {
  potency: number; // Giftstärke; wächst beim Säen und beim Reifen, bestimmt Glühen/Drosselung/Reife
  tickCd: number; // s bis zum nächsten Tick
}

export interface GartenConfig {
  saat: number; // Start-Potenz pro Schuss (Infektion)
  reife: number; // Potenz-Faktor pro Tick (>1 = reift Richtung Schwelle)
  tickEvery: number; // s zwischen Ticks
  tickDmg: number; // kleiner Köchel-Schaden WÄHREND der Reifung (überlebbar — der Panzer soll reif werden)
  reifDmg: number; // tödlicher Gift-Schaden, sobald reif (frisst den stehenden Panzer auf)
  slow: number; // 0..1 Tempo-Anteil, der frisch Infizierten genommen wird (steigt mit Reife bis 1 = steht)
  erntePot: number; // Potenz-Schwelle: ab hier reif (rot, steht, stirbt am Gift)
  ansteckRadius: number; // Welt-Radius: ein Infizierter steckt den nächsten Gesunden an (Aufrufer nutzt es)
  dmgProFieber: number; // +reifDmg pro Erntefieber (der EINZIGE Buff-Effekt: reifes Gift tödlicher)
}

export const DEFAULT_GARTEN: GartenConfig = {
  saat: 6,
  reife: 1.15,
  tickEvery: 0.5,
  tickDmg: 1,
  reifDmg: 9,
  slow: 0.4,
  erntePot: 36,
  ansteckRadius: 30,
  dmgProFieber: 2,
};

/** Ein Schuss infiziert/erneuert ein Ziel: Grund-Saat drauf. Kein Buff-Bezug (Erntefieber wirkt nur aufs reife Gift). */
export function saeGift(g: GiftState | undefined, cfg: GartenConfig): GiftState {
  return { potency: (g?.potency ?? 0) + cfg.saat, tickCd: g?.tickCd ?? cfg.tickEvery };
}

/** Reif = Potenz hat die Schwelle erreicht (rot, steht, tödliches Gift). */
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
 * Anteil 0..1 des Tempos, der dem vergifteten Gegner GENOMMEN wird. Frisch = cfg.slow, und es steigt
 * mit der Reife bis 1 (reif → steht). Der Aufrufer rechnet: effektivesTempo = basis × (1 − giftSlow).
 */
export function giftSlow(g: GiftState, cfg: GartenConfig): number {
  const f = Math.min(1, g.potency / cfg.erntePot);
  return cfg.slow + (1 - cfg.slow) * f;
}

/**
 * Gift um dt weiterrechnen (mutiert g). Liefert den fälligen Tick-Schaden und ob ein Tick fiel
 * (für die Ansteckung). Während der Reifung köchelt es klein (tickDmg) und reift (×reife); sobald
 * reif, hört das Reifen auf und das Gift wird tödlich (reifDmg + Erntefieber-Bonus) — es tötet.
 */
export function tickGift(
  g: GiftState,
  dt: number,
  cfg: GartenConfig,
  fieber = 0,
): { dmg: number; ticked: boolean } {
  g.tickCd -= dt;
  if (g.tickCd > 0) return { dmg: 0, ticked: false };
  g.tickCd += cfg.tickEvery;
  if (g.potency >= cfg.erntePot) {
    return { dmg: cfg.reifDmg + fieber * cfg.dmgProFieber, ticked: true }; // reif → tödliches Gift
  }
  g.potency *= cfg.reife; // reift weiter Richtung Schwelle
  return { dmg: cfg.tickDmg, ticked: true }; // köchelt klein (überlebbar)
}
