/**
 * Gegner-Nachsetzen — ersetzt das Rubberband. Statt zurückgefallene Gegner künstlich schneller aufholen
 * zu lassen, wird ein Gegner, der LANGE untätig war (weder angegriffen noch in Schussreichweite), neu
 * platziert: er taucht im FAHRTWEG des Spielers wieder auf, sodass man in ihn hineinfährt. Reine
 * Geometrie, kein Engine-Bezug (TDD); der Untätig-Timer + das Umsetzen sitzen im Aufrufer (main.ts).
 */
export interface NachsetzCfg {
  timeout: number; // s untätig (kein Treffer kassiert UND nicht in Schussreichweite) bis zur Neuplatzierung
  distMin: number; // min Distanz voraus, in die der Gegner gesetzt wird
  distSpanne: number; // + zufälliger Distanz-Aufschlag
  streuung: number; // ± Winkel-Fächer um die Fahrtrichtung (rad)
}

export const DEFAULT_NACHSETZ: NachsetzCfg = {
  timeout: 15,
  distMin: 55,
  distSpanne: 35,
  streuung: Math.PI / 3, // ±60° um die Fahrtrichtung
};

/** Ist der Gegner lange genug untätig, um neu platziert zu werden? */
export function nachsetzenFaellig(untaetig: number, cfg: NachsetzCfg = DEFAULT_NACHSETZ): boolean {
  return untaetig >= cfg.timeout;
}

/**
 * Spawn-Punkt im Fahrtweg: voraus in Bewegungsrichtung (± Streuung), Distanz in [distMin, distMin+distSpanne].
 * Steht der Spieler (kein Tempo), gibt es keinen Fahrtweg → rundum verteilt. `rng()` liefert 0..1 (injizierbar).
 */
export function spawnImFahrtweg(
  px: number,
  pz: number,
  vx: number,
  vz: number,
  rng: () => number,
  cfg: NachsetzCfg = DEFAULT_NACHSETZ,
): { x: number; z: number } {
  const tempo = Math.hypot(vx, vz);
  const basis = tempo > 1 ? Math.atan2(vz, vx) : rng() * Math.PI * 2; // Fahrtrichtung, sonst rundum
  const ang = basis + (rng() - 0.5) * cfg.streuung;
  const r = cfg.distMin + rng() * cfg.distSpanne;
  return { x: px + Math.cos(ang) * r, z: pz + Math.sin(ang) * r };
}
