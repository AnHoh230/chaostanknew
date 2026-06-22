/**
 * Garten-Build (Z-Z-Z) — reine Reife-Logik, kein Engine-Bezug (TDD).
 *
 * Die drei Z-Schichten als eine spielbare Mechanik:
 * - SÄEN (Slot 1): Ein Schuss erhöht die Potenz (= Schaden pro Tick) + frischt die Dauer auf.
 * - VERTIEFEN (Slot 2): Jeder Tick macht Schaden = Potenz und lässt sie REIFEN (×reife > 1).
 *   Die Potenz bestimmt die sichtbare Reife-Stufe (Aufrufer färbt den Gegner ein).
 * - ERNTEN (Slot 3): Erreicht die Potenz die Ernteschwelle, BRICHT die Wunde auf — ein
 *   großer Knall (Burst), der Aufrufer löst ihn aus. Der Höhepunkt.
 */
export interface GiftState {
  potency: number; // Giftstärke = Schaden pro Tick; wächst beim Säen UND beim Reifen
  tickCd: number; // s bis zum nächsten Tick
  life: number; // s Restdauer ohne Nachschuss
}

export interface GartenConfig {
  saat: number; // Potenz-Zuwachs pro Schuss
  reife: number; // Potenz-Faktor pro Tick (>1 = reift, Schaden wächst)
  tickEvery: number; // s zwischen Ticks
  giftDur: number; // s, die Gift ohne Nachschuss hält
  slow: number; // 0..1 Tempo-Drosselung vergifteter Gegner (Bedrohung sofort runter)
  erntePot: number; // Potenz-Schwelle: ab hier bricht die Wunde auf (Ernte)
  ernteBurst: number; // Erntebruch-Schaden = Potenz × ernteBurst (der Knall)
}

export const DEFAULT_GARTEN: GartenConfig = {
  saat: 3,
  reife: 1.18,
  tickEvery: 0.5,
  giftDur: 6,
  slow: 0.5,
  erntePot: 24,
  ernteBurst: 6, // Erntebruch wuchtig genug, dass er der tödliche Höhepunkt ist (nicht das Ticken)
};

/** Ein Schuss sät/erneuert Gift: Potenz dazu, Dauer zurücksetzen. */
export function saeGift(g: GiftState | undefined, cfg: GartenConfig): GiftState {
  return {
    potency: (g?.potency ?? 0) + cfg.saat,
    tickCd: g?.tickCd ?? cfg.tickEvery,
    life: cfg.giftDur,
  };
}

/** Sichtbare Reife-Stufe 0..3 aus der Potenz (Aufrufer mappt sie auf eine Glüh-Farbe). */
export function reifeStufe(g: GiftState, cfg: GartenConfig): 0 | 1 | 2 | 3 {
  const f = g.potency / cfg.erntePot;
  if (f >= 1) return 3; // reif → bricht beim nächsten Tick auf
  if (f >= 0.6) return 2;
  if (f >= 0.3) return 1;
  return 0;
}

/**
 * Gift um dt weiterrechnen (mutiert g). Liefert:
 * - dmg: fälliger Tick-Schaden (0 = noch kein Tick)
 * - expired: Gift verfallen (→ Aufrufer entfernt es)
 * - ernte: Potenz hat die Schwelle erreicht → Aufrufer löst den Erntebruch aus
 */
export function tickGift(
  g: GiftState,
  dt: number,
  cfg: GartenConfig,
): { dmg: number; expired: boolean; ernte: boolean } {
  g.life -= dt;
  if (g.life <= 0) return { dmg: 0, expired: true, ernte: false };
  g.tickCd -= dt;
  if (g.tickCd > 0) return { dmg: 0, expired: false, ernte: false };
  g.tickCd += cfg.tickEvery;
  if (g.potency >= cfg.erntePot) return { dmg: 0, expired: false, ernte: true }; // reif → Erntebruch
  const dmg = Math.round(g.potency);
  g.potency *= cfg.reife; // reift weiter → nächster Tick trifft härter
  return { dmg, expired: false, ernte: false };
}
