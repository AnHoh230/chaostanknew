/**
 * Garten-Build (Z-Z-Z) — reine Reife-Logik, kein Engine-Bezug (TDD).
 *
 * Markierte Ziele tragen *reifendes* Gift statt Direktschaden:
 * - Ein Schuss SÄT: erhöht die Potenz (= Schaden pro Tick) und frischt die Dauer auf.
 * - Jeder Tick macht Schaden = Potenz und lässt die Potenz weiter REIFEN (×reife > 1).
 * - Ohne Nachschuss verfällt das Gift nach giftDur.
 * Spielgefühl: säen → wachsen lassen → ernten. Wer lange lebt, stirbt am heftigsten.
 */
export interface GiftState {
  potency: number; // aktuelle Giftstärke = Schaden pro Tick; wächst beim Säen UND beim Reifen
  tickCd: number; // s bis zum nächsten Tick
  life: number; // s Restdauer ohne Nachschuss
}

export interface GartenConfig {
  saat: number; // Potenz-Zuwachs pro Schuss
  reife: number; // Potenz-Faktor pro Tick (>1 = reift, Schaden wächst)
  tickEvery: number; // s zwischen Ticks
  giftDur: number; // s, die Gift ohne Nachschuss hält
  slow: number; // 0..1 Tempo-Drosselung vergifteter Gegner (Bedrohung sofort runter)
}

export const DEFAULT_GARTEN: GartenConfig = {
  saat: 3,
  reife: 1.18,
  tickEvery: 0.5,
  giftDur: 6,
  slow: 0.5,
};

/** Ein Schuss sät/erneuert Gift: Potenz dazu, Dauer zurücksetzen. */
export function saeGift(g: GiftState | undefined, cfg: GartenConfig): GiftState {
  return {
    potency: (g?.potency ?? 0) + cfg.saat,
    tickCd: g?.tickCd ?? cfg.tickEvery,
    life: cfg.giftDur,
  };
}

/**
 * Gift um dt weiterrechnen (mutiert g). Liefert den fälligen Tick-Schaden (0 = noch kein Tick)
 * und ob das Gift verfallen ist (→ Aufrufer entfernt es).
 */
export function tickGift(g: GiftState, dt: number, cfg: GartenConfig): { dmg: number; expired: boolean } {
  g.life -= dt;
  if (g.life <= 0) return { dmg: 0, expired: true };
  g.tickCd -= dt;
  if (g.tickCd > 0) return { dmg: 0, expired: false };
  g.tickCd += cfg.tickEvery;
  const dmg = Math.round(g.potency);
  g.potency *= cfg.reife; // reift weiter → nächster Tick trifft härter
  return { dmg, expired: false };
}
