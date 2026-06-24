/**
 * B-Build („Befehl", Kern/sniper-Pol) — Reihenfolge + Schadens-Aufbau als reine Zustandsmaschine.
 * Gegenstück zum Z-Garten: statt Seuche säen markiert man Ziele und exekutiert sie IN REIHENFOLGE.
 *
 * Markieren (im Scope, ab BB auch automatisch) vergibt Order-Nummern 1..3 in Markier-Reihenfolge.
 * Abgearbeitet wird streng der Reihe nach: das „aktuelle" Ziel (order == nextOrder) darf beliebig
 * oft beschossen werden (1·1·1 bis tot), aber ein Treffer auf ein HÖHERES markiertes Ziel (Vorgriff,
 * z. B. 2 vor 1) bricht die Kaskade → alle Ziele verfallen, neu setzen.
 *
 * Schadens-Aufbau (ab BB): nach der ersten vollen Reihe (3 in Folge) zählt jeder weitere in-Reihe-Kill
 * eine AUFBAU-STUFE hoch (Kette 4 = +1, 5 = +2, 6 = +3 …). Jede Stufe gibt additiven Schaden (Aufrufer).
 *  - BB : Aufbau gedeckelt bei BB_CAP (+3). Ist er voll, RASTET der Bonus als Buff B ein (BUFF_TIME-
 *         Countdown, der auch ohne Markierung weiterwirkt), die Kette ist abgeschlossen (Auto-Stop).
 *         Erneut volle 6 abknallen erneuert den Countdown — gestapelt wird NICHT über +3.
 *  - BBB: kein Deckel. Der gehaltene Bonus wächst grenzenlos mit der Kette und VERFÄLLT NIE (perma).
 *         Reißt die Kette ab (COMBO_TIME ohne Kill, keine Ziele), bleibt der erspielte Schaden stehen —
 *         man wirft nur die 1·2·3 neu an und stapelt weiter (Gift-Prinzip: praktisch immer stärker).
 *
 * Markierte sterben NIE instant — immer über (erhöhten) Schaden. Reine Funktionen (TDD), kein Engine-Bezug.
 */
export const MAX_MARKS = 3;
export const COMBO_TIME = 10; // s bis die laufende Kette ohne Kill abreißt (HUD-Countdown)
export const BUFF_TIME = 10; // s Laufzeit des eingerasteten Buff B (BB); erneuerbar
export const BB_CAP = 3; // BB: Aufbau- und Buff-Deckel (Stufen)

export interface Mark {
  id: string;
  order: number; // abzuarbeitende Reihenfolge: 1..MAX_MARKS in der Reihe, 1 für eine einzelne Auto-Marke
  nr: number; // fortlaufende Anzeige-Nummer der Sequenz: Reihe 1·2·3, dann Auto-Aufbau 4·5·6 …
}

export interface BefehlState {
  marks: Mark[]; // aktuelle Markierungen (max MAX_MARKS)
  nextOrder: number; // nächste abzuarbeitende Order (1..MAX_MARKS)
  kette: number; // aufeinanderfolgende in-Reihe-Kills (treibt die Aufbau-Stufe + Kaskaden-Speed)
  combo: number; // s Restzeit der laufenden Kette (refresh bei Kill); 0 = inaktiv
  buffStufe: number; // gehaltene Schadens-Stufe: BB = eingerasteter Buff B (≤BB_CAP), BBB = perma-Sockel
  buffRest: number; // s Restzeit des gehaltenen Bonus: >0 = Countdown (BB), <0 = permanent (BBB), 0 = aus
}

export function createBefehlState(): BefehlState {
  return { marks: [], nextOrder: 1, kette: 0, combo: 0, buffStufe: 0, buffRest: 0 };
}

export function markVoll(s: BefehlState): boolean {
  return s.marks.length >= MAX_MARKS;
}

/** Markiert ein Ziel mit der nächsten freien Order. false, wenn voll oder schon markiert. */
export function markiere(s: BefehlState, id: string): boolean {
  if (markVoll(s) || s.marks.some((m) => m.id === id)) return false;
  // nr = fortlaufende Sequenz-Position: Reihe (kette 0) → 1·2·3; Auto-Aufbau (kette≥3) → kette+1 = 4·5·6…
  s.marks.push({ id, order: s.marks.length + 1, nr: s.kette + s.marks.length + 1 });
  return true;
}

/**
 * Soll der Auto-Markierer (BB+) gerade EIN nächstes Ziel setzen? Erst NACH der manuellen Reihe (kette≥3),
 * immer nur eine Auto-Marke zur Zeit (die vorige muss tot sein); BB nur bis zum Cap (kette < MAX_MARKS+BB_CAP).
 */
export function autoMarkBereit(s: BefehlState, bbb: boolean): boolean {
  if (s.kette < MAX_MARKS || s.marks.length > 0) return false;
  if (!bbb && s.kette >= MAX_MARKS + BB_CAP) return false;
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

/** Laufende Aufbau-Stufe aus der lebenden Kette: 0 bis zur ersten vollen Reihe, dann +1 je weiterem Kill. */
export function aufbauStufe(s: BefehlState): number {
  return Math.max(0, s.kette - MAX_MARKS);
}

/** Effektive Schadens-Stufe = größerer Wert aus laufendem Aufbau und gehaltenem Buff (B/perma). */
export function schadenStufe(s: BefehlState): number {
  const gehalten = s.buffRest !== 0 ? s.buffStufe : 0; // buffRest<0 = permanent (BBB), >0 = Countdown (BB)
  return Math.max(aufbauStufe(s), gehalten);
}

/**
 * Reihenfolge gebrochen (Vorgriff): die laufende Kette verfällt, aber der bereits GEHALTENE Bonus
 * (Buff B / perma-Sockel) überlebt einen Reihenfolge-Fehler — den verliert man nur durch Auslaufen.
 */
export function bruch(s: BefehlState): void {
  s.marks = [];
  s.nextOrder = 1;
  s.kette = 0;
  s.combo = 0;
}

export interface KillFolge {
  reiheKomplett: boolean; // volle MAX_MARKS-Reihe in Folge erledigt → main setzt neue Ziele (Auto-Nachziel)
  capErreicht: boolean; // BB: Aufbau hat BB_CAP erreicht → Buff B eingerastet, Kette abgeschlossen (Auto-Stop)
}

/**
 * Das aktuelle markierte Ziel `id` ist (korrekt in Reihenfolge) gestorben: Kette hoch, Combo-Timer
 * refresht, Zeiger rückt weiter. `bbb` steuert den Aufbau: BB deckelt bei BB_CAP und rastet den Buff
 * ein; BBB lässt den gehaltenen Bonus grenzenlos und permanent mitwachsen.
 * Ein Kill, der NICHT das aktuelle Ziel ist, ändert nichts (Kollateral/Edge).
 */
export function registriereKill(s: BefehlState, id: string, bbb: boolean): KillFolge {
  const m = s.marks.find((x) => x.id === id);
  if (!m || m.order !== s.nextOrder) return { reiheKomplett: false, capErreicht: false };
  s.kette += 1;
  s.combo = COMBO_TIME;
  s.marks = s.marks.filter((x) => x.id !== id);
  s.nextOrder += 1;
  const reiheKomplett = s.nextOrder > MAX_MARKS; // nur eine VOLLE MAX_MARKS-Reihe gilt als komplett
  // Salve abgearbeitet (auch unvollständig, z. B. nur 2 markiert) → Zeiger zurück für die nächste Salve.
  if (s.marks.length === 0) { s.nextOrder = 1; s.marks = []; }
  const stufe = aufbauStufe(s);
  if (bbb) {
    // BBB: gehaltener Bonus wächst grenzenlos mit der Kette, verfällt nie (permanent).
    if (stufe > s.buffStufe) s.buffStufe = stufe;
    if (s.buffStufe > 0) s.buffRest = -1;
    return { reiheKomplett, capErreicht: false };
  }
  // BB: Aufbau gedeckelt — ist BB_CAP erreicht, rastet Buff B (erneut) ein und die Kette ist fertig.
  if (stufe >= BB_CAP) {
    s.buffStufe = BB_CAP;
    s.buffRest = BUFF_TIME;
    s.kette = 0; s.combo = 0; s.marks = []; s.nextOrder = 1;
    return { reiheKomplett: false, capErreicht: true };
  }
  return { reiheKomplett, capErreicht: false };
}

/**
 * Pro Frame (BB+): der Ketten-Timer reißt die laufende Kette ab (gehaltener Bonus bleibt), und ein
 * laufender Buff B (BB) tickt aus. Liefert `abriss`, damit der Aufrufer die Slow-Marken aufräumt.
 */
export function tickBefehl(s: BefehlState, dt: number): { abriss: boolean } {
  let abriss = false;
  if (s.kette > 0 && s.combo > 0) {
    s.combo -= dt;
    if (s.combo <= 0) abriss = true; // Aufrufer macht bruch() + entmarkiereAlle() (Bonus überlebt)
  }
  if (s.buffRest > 0) {
    s.buffRest -= dt;
    if (s.buffRest <= 0) { s.buffRest = 0; s.buffStufe = 0; } // Buff B ausgelaufen
  }
  return { abriss };
}
