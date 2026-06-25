/**
 * R-Build („Raum", Kern/aoe-Pol) — Schaden über hingelegte FELDER statt Marken/Gift. Reine
 * Zustandsmaschine, kein Engine-Bezug (TDD). Drittes Gegenstück zu Befehl (B) und Garten (Z).
 *
 * Grundprinzip: im Scope legt jede Munition EIN Feld (Fläche) ab. Felder bleiben liegen; wer drauf
 * fährt, kassiert pro Tick Schaden und wird verlangsamt.
 *  - R   : max RAUM_MAX_FELDER liegen gleichzeitig; ein neues Feld schiebt nach FIFO das älteste weg.
 *          Feld-Schaden ist FEST anhand des ANFANGS-Lebens kalibriert (Basis-HP/ticksZumTod): ein
 *          Gegner mit Start-HP stirbt in ticksZumTod Ticks. Höher-levelige haben mehr HP → leben
 *          länger (gewollt — der Build ist tanky, der Schaden kommt NICHT über die Gegner-HP).
 *  - RR  : wer einmal im Feld war, ist „gefangen" — will er raus, zieht ihn das Feld zur Mitte zurück.
 *          Spielweise: Feld hin, nachladen, das nächste Feld so setzen, dass es die Gegner einfängt.
 *  - RRR : ein IM FELD gestorbener Gegner gibt ERNTE → buff +1. Der Buff macht (additiv) mehr
 *          Feld-Schaden UND lässt die Felder wachsen (10 % des Buffs Radius: Buff 250 → +25 %).
 *
 * Häscher (Anti-Camp beim Felder-unter-sich-Legen) sind IMMUN gegen den Zug, nicht gegen den Schaden —
 * das entscheidet der Aufrufer (haescher-Flag), raum.ts bleibt rein.
 */
export interface Feld {
  x: number;
  z: number;
}

export interface RaumState {
  felder: Feld[]; // aktuell liegende Felder (max cfg.maxFelder, FIFO darüber)
  buff: number; // RRR-Ernte-Aufbau: +1 je Feld-Kill; treibt Feld-Schaden (additiv) + Feldgröße
}

export function createRaumState(): RaumState {
  return { felder: [], buff: 0 };
}

export interface RaumConfig {
  maxFelder: number; // gleichzeitig liegende Felder
  radius: number; // Basis-Feldradius (Welt-Einheiten)
  tickEvery: number; // s zwischen Feld-Ticks
  ticksZumTod: number; // so viele Ticks töten einen Gegner mit ANFANGS-/Basis-HP (Kalibrierung)
  dmgProBuff: number; // +Feld-Schaden/Tick je Ernte-Buff (RRR — hier kommt die Schadensskalierung her)
  slow: number; // 0..1 Tempo-Anteil, der im Feld genommen wird
  wachstumProBuff: number; // +Radius-Anteil je Buff (0.001 → Buff 250 = +25 %)
  zugStaerke: number; // RR: Welt-Einheiten/s, mit denen Gefangene zur Feld-Mitte gezogen werden
}

export const DEFAULT_RAUM: RaumConfig = {
  maxFelder: 3,
  radius: 14,
  tickEvery: 0.5,
  ticksZumTod: 4,
  dmgProBuff: 2,
  slow: 0.5,
  wachstumProBuff: 0.001,
  zugStaerke: 40,
};

/** Legt ein Feld an (x,z). FIFO: liegt schon das Maximum, wird das ÄLTESTE umgelagert (entfernt + zurückgegeben). */
export function legeFeld(s: RaumState, x: number, z: number, cfg: RaumConfig = DEFAULT_RAUM): Feld | null {
  s.felder.push({ x, z });
  if (s.felder.length > cfg.maxFelder) return s.felder.shift() ?? null;
  return null;
}

/** Effektiver Feldradius: Basis × (1 + Buff × Wachstum). RRR lässt die Felder mit dem Ernte-Buff wachsen. */
export function feldRadius(cfg: RaumConfig, buff: number): number {
  return cfg.radius * (1 + buff * cfg.wachstumProBuff);
}

/** Das (älteste) Feld, in dem der Punkt (x,z) liegt — oder null. Für Schaden/Slow/Zug-Mitte. */
export function feldAn(s: RaumState, x: number, z: number, cfg: RaumConfig = DEFAULT_RAUM): Feld | null {
  const r = feldRadius(cfg, s.buff);
  for (const f of s.felder) if (Math.hypot(x - f.x, z - f.z) <= r) return f;
  return null;
}

/**
 * Feld-Schaden pro Tick gegen einen Gegner. Basis = ANFANGS-HP / ticksZumTod (so stirbt ein Gegner mit
 * Start-Leben in genau ticksZumTod Ticks), plus additiver Ernte-Buff (RRR). NICHT von der aktuellen
 * (level-skalierten) HP abhängig — höher-levelige leben länger.
 */
export function feldSchaden(basisHp: number, buff: number, cfg: RaumConfig = DEFAULT_RAUM): number {
  return Math.max(1, Math.round(basisHp / cfg.ticksZumTod + buff * cfg.dmgProBuff));
}

/** Tempo-Anteil 0..1, der im Feld genommen wird (konstant). Aufrufer: effektivesTempo = basis × (1 − feldSlow). */
export function feldSlow(cfg: RaumConfig = DEFAULT_RAUM): number {
  return cfg.slow;
}

/** RR-Zug: normierter Richtungsvektor von (ex,ez) zur Feld-Mitte (für Gefangene, die rauswollen). */
export function zugZurMitte(f: Feld, ex: number, ez: number): { dx: number; dz: number } {
  const dx = f.x - ex, dz = f.z - ez;
  const l = Math.hypot(dx, dz) || 1;
  return { dx: dx / l, dz: dz / l };
}

/** RRR: ein im Feld gestorbener Gegner gibt Ernte → Buff +1 (mehr Feld-Schaden + größere Felder). */
export function ernteFeldKill(s: RaumState): void {
  s.buff += 1;
}

/** Pro-Gegner Feld-Zustand: Tick-Countdown + ob er schon einmal im Feld war (RR-Fang). */
export interface FeldTreffer {
  tickCd: number;
  gefangen: boolean;
}

/**
 * Ein Gegner um dt im Feld weiterrechnen (mutiert t). Außerhalb: Cooldown zurück (beim Reinfahren
 * sofort ein Tick). Drinnen: tickt cfg.tickEvery; bei fälligem Tick der Feld-Schaden. `imFeld` und der
 * Basis-HP-Wert kommen vom Aufrufer (der kennt Position/Typ); Slow + RR-Zug macht ebenfalls der Aufrufer.
 */
export function tickFeld(
  t: FeldTreffer,
  imFeld: boolean,
  basisHp: number,
  buff: number,
  dt: number,
  cfg: RaumConfig = DEFAULT_RAUM,
): { dmg: number; ticked: boolean } {
  if (!imFeld) {
    t.tickCd = 0; // außerhalb: nächster Eintritt tickt sofort
    return { dmg: 0, ticked: false };
  }
  t.gefangen = true; // einmal drin = gefangen (RR-Zug greift, sobald er rauswill)
  t.tickCd -= dt;
  if (t.tickCd > 0) return { dmg: 0, ticked: false };
  t.tickCd += cfg.tickEvery;
  return { dmg: feldSchaden(basisHp, buff, cfg), ticked: true };
}
