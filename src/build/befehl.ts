/**
 * B-Build („Befehl", Kern/sniper-Pol) — die reine Reihenfolge-/Kaskaden-/Combo-Zustandsmaschine.
 * Gegenstück zum Z-Garten: statt Seuche säen markiert man Ziele und exekutiert sie IN REIHENFOLGE.
 *
 * Markieren (im Scope, ab BB auch automatisch) vergibt Order-Nummern 1..3 in Markier-Reihenfolge.
 * Abgearbeitet wird streng der Reihe nach: das „aktuelle" Ziel (order == nextOrder) darf beliebig
 * oft beschossen werden (1·1·1 bis tot), aber ein Treffer auf ein HÖHERES markiertes Ziel (Vorgriff,
 * z. B. 2 vor 1) bricht die Kaskade → alle Ziele verfallen, neu setzen.
 *
 * Stufen:
 *  - B   : markieren → verwundbar (mehr Schaden) + langsam; munitionsfrei abschießen (Wirkung in main).
 *  - BB  : Reihenfolge zählt → kaskadierender Movement-Speed (aus `kette`); volle 3er-Reihe → neue
 *          Ziele setzen sich automatisch; Combo-Timer (10 s) hält die Kette, refresht bei jedem Kill.
 *  - BBB : Verstärkungsbuff (mehr Schaden, stapelt mit `kette`); ab 6 in-Reihe-Kills Simultan-Schuss.
 *
 * Markierte sterben NIE instant — immer über (erhöhten) Schaden. Reine Funktionen (TDD), kein Engine-Bezug.
 */
export const MAX_MARKS = 3;
export const COMBO_TIME = 10; // s bis die Kette ohne Kill bricht (HUD-Countdown)
export const SIMULTAN_SCHWELLE = 6; // in-Reihe-Kills bis zum Simultan-Schuss
export const VERSTAERK_AB = 3; // ab so vielen in-Reihe-Kills beginnt der Verstärkungsbuff (erste volle Reihe = Stufe 1)

export interface Mark {
  id: string;
  order: number; // 1..MAX_MARKS, in Markier-Reihenfolge
}

export interface BefehlState {
  marks: Mark[]; // aktuelle Markierungen (max MAX_MARKS)
  nextOrder: number; // nächste abzuarbeitende Order (1..MAX_MARKS)
  kette: number; // aufeinanderfolgende in-Reihe-Kills (Kaskaden-Speed + Verstärkung)
  combo: number; // s Restzeit der Kette (refresh bei Kill); 0 = inaktiv
}

export function createBefehlState(): BefehlState {
  return { marks: [], nextOrder: 1, kette: 0, combo: 0 };
}

export function markVoll(s: BefehlState): boolean {
  return s.marks.length >= MAX_MARKS;
}

/** Markiert ein Ziel mit der nächsten freien Order. false, wenn voll oder schon markiert. */
export function markiere(s: BefehlState, id: string): boolean {
  if (markVoll(s) || s.marks.some((m) => m.id === id)) return false;
  s.marks.push({ id, order: s.marks.length + 1 });
  return true;
}

/** Das aktuell abzuarbeitende markierte Ziel (order == nextOrder), oder null. */
export function aktuellesZiel(s: BefehlState): Mark | null {
  return s.marks.find((m) => m.order === s.nextOrder) ?? null;
}

export type TrefferArt = 'aktuell' | 'vorgriff' | 'fremd';

/** Treffer-Typ eines Schusses auf `id` — OHNE Zustandsänderung. Niedrigere Orders sind bereits tot. */
export function trefferArt(s: BefehlState, id: string): TrefferArt {
  const m = s.marks.find((x) => x.id === id);
  if (!m) return 'fremd';
  return m.order === s.nextOrder ? 'aktuell' : 'vorgriff';
}

/** Reihenfolge gebrochen: alle Ziele verfallen, Kaskade + Combo zurück auf 0. */
export function bruch(s: BefehlState): void {
  s.marks = [];
  s.nextOrder = 1;
  s.kette = 0;
  s.combo = 0;
}

export interface KillFolge {
  reiheKomplett: boolean; // alle MAX_MARKS der Runde erledigt → main setzt neue Ziele
  simultan: boolean; // ab SIMULTAN_SCHWELLE in-Reihe-Kills: Simultan-Schuss bereit
}

/**
 * Das aktuelle markierte Ziel `id` ist (korrekt in Reihenfolge) gestorben: Kaskade hoch, Combo-Timer
 * refresht, Zeiger rückt weiter. Ist die Runde voll → Reihe komplett (main setzt neue Ziele).
 * Ein Kill, der NICHT das aktuelle Ziel ist, ändert die Kette nicht (Kollateral/Edge).
 */
export function registriereKill(s: BefehlState, id: string): KillFolge {
  const m = s.marks.find((x) => x.id === id);
  if (!m || m.order !== s.nextOrder) return { reiheKomplett: false, simultan: s.kette >= SIMULTAN_SCHWELLE };
  s.kette += 1;
  s.combo = COMBO_TIME;
  s.marks = s.marks.filter((x) => x.id !== id);
  s.nextOrder += 1;
  let reiheKomplett = false;
  if (s.nextOrder > MAX_MARKS) {
    s.nextOrder = 1;
    s.marks = [];
    reiheKomplett = true;
  }
  return { reiheKomplett, simultan: s.kette >= SIMULTAN_SCHWELLE };
}

/** Verstärkungsbuff-Stufen (BBB): erste volle Reihe (kette==3) = 1, danach +1 je weiterem Kill. */
export function verstaerkung(s: BefehlState): number {
  return Math.max(0, s.kette - (VERSTAERK_AB - 1));
}

/** Combo-Timer (BB+): tickt nur bei aktiver Kette; läuft er ab → Bruch (Kette verfällt). */
export function tickCombo(s: BefehlState, dt: number): void {
  if (s.kette <= 0) return;
  s.combo -= dt;
  if (s.combo <= 0) bruch(s);
}
