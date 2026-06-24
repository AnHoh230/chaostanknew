/**
 * Bewegungs-Heat (interner Anti-Exploit-Direktor, dem Spieler NICHT angezeigt). Liest nur,
 * WIE sich der Spieler bewegt, und baut zwei Drücke auf:
 *
 *  - Kessel  (Stehenbleiben): steigt, solange der Spieler steht; fällt, sobald er fährt.
 *            → die Welt lässt den Ring sich von allen Seiten näher schließen.
 *  - Fährte  (einseitiges Fahren): steigt, solange der Spieler GERADLINIG in eine Richtung
 *            fährt; fällt, sobald er die Richtung wechselt (oder steht).
 *            → die Welt legt sich ihm voraus (Spawns in Fahrtrichtung).
 *
 * Verhältnis 1:1 (Default): gleich lange „ordentlich" spielen baut den Druck wieder ab.
 * Geradlinigkeit = |geglätteter Geschwindigkeitsvektor| / geglätteter Tempobetrag: schnurgerade ≈ 1,
 * Schlangenlinien/Hin-und-Her ≈ 0. Reine Funktion (TDD), kein Engine-Bezug.
 */
export interface HeatState {
  kessel: number; // 0..max — Steh-Druck
  faehrte: number; // 0..max — Einseitig-Fahr-Druck
  emaVx: number; // geglätteter Geschwindigkeitsvektor (für Geradlinigkeit)
  emaVz: number;
  emaSpeed: number; // geglätteter Tempobetrag
}

export interface HeatCfg {
  movingSpeed: number; // ab diesem Tempo gilt der Spieler als „fahrend"
  stillSpeed: number; // unter diesem Tempo gilt er als „stehend"
  riseKessel: number; // Kessel-Anstieg pro s im Stand
  riseFaehrte: number; // Fährte-Anstieg pro s bei geradlinigem Fahren
  fall: number; // Abbau pro s bei „ordentlichem" Spiel (= rise → 1:1-Ausgleich)
  straightThresh: number; // ab dieser Geradlinigkeit (0..1) zählt Fahren als „einseitig"
  tau: number; // Glättungs-Zeitkonstante (s) für Richtung/Tempo
  max: number; // Deckel je Heat
}

// Zeitkonstanten: ~25 s reines Stehen/Geradeausfahren → voller Druck (und ebenso lang zum Abbau).
// straightThresh 0.8 + langes Glättungsfenster (tau 5 s): nur KLAR geradliniges, ANHALTENDES Fahren
// treibt die Fährte — moderates Vorrücken mit Zickzack mittelt sich weg (Netto-Drift « Tempo → niedrig).
export const DEFAULT_HEAT_CFG: HeatCfg = {
  movingSpeed: 4,
  stillSpeed: 2,
  riseKessel: 1 / 25,
  riseFaehrte: 1 / 25,
  fall: 1 / 25,
  straightThresh: 0.8,
  tau: 5,
  max: 1,
};

export function createHeatState(): HeatState {
  return { kessel: 0, faehrte: 0, emaVx: 0, emaVz: 0, emaSpeed: 0 };
}

const clamp = (v: number, max: number): number => (v < 0 ? 0 : v > max ? max : v);

export function updateHeat(s: HeatState, vx: number, vz: number, dt: number, cfg: HeatCfg = DEFAULT_HEAT_CFG): HeatState {
  if (dt <= 0) return s;
  const speed = Math.hypot(vx, vz);
  const a = 1 - Math.exp(-dt / cfg.tau); // EMA-Gewicht
  const emaVx = s.emaVx + a * (vx - s.emaVx);
  const emaVz = s.emaVz + a * (vz - s.emaVz);
  const emaSpeed = s.emaSpeed + a * (speed - s.emaSpeed);
  const straight = emaSpeed > 0.1 ? Math.hypot(emaVx, emaVz) / emaSpeed : 0;

  const moving = speed > cfg.movingSpeed;
  const still = speed < cfg.stillSpeed;
  // Kessel: steht → hoch, fährt → runter, im Übergangsband → halten.
  const kessel = clamp(s.kessel + (still ? cfg.riseKessel : moving ? -cfg.fall : 0) * dt, cfg.max);
  // Fährte: geradlinig fahren → hoch, sonst (Richtungswechsel/Stehen) → runter.
  const einseitig = moving && straight > cfg.straightThresh;
  const faehrte = clamp(s.faehrte + (einseitig ? cfg.riseFaehrte : -cfg.fall) * dt, cfg.max);

  return { kessel, faehrte, emaVx, emaVz, emaSpeed };
}
