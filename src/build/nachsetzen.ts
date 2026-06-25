/**
 * Gegner-Nachsetzen — ersetzt das Rubberband. Ein Gegner, der LANGE untätig war (weder einen Treffer
 * kassiert noch in Schussreichweite), wird NAHE um den Spieler herum neu platziert (Radius ~distMin),
 * damit er sofort wieder im Kampfgeschehen ist — nicht weit voraus, wo man ihn wieder verliert. Reine
 * Geometrie, kein Engine-Bezug (TDD); Untätig-Timer + Umsetzen sitzen im Aufrufer (main.ts).
 * Markierte Gegner (Fadenkreuz) werden NICHT nachgesetzt — das entscheidet der Aufrufer.
 */
export interface NachsetzCfg {
  timeout: number; // s untätig (kein Treffer kassiert UND nicht in Schussreichweite) bis zur Neuplatzierung
  distMin: number; // Radius (Welt-Einheiten), in dem rund um den Spieler neu platziert wird
  distSpanne: number; // + zufälliger Radius-Aufschlag
}

export const DEFAULT_NACHSETZ: NachsetzCfg = {
  timeout: 15,
  distMin: 40,
  distSpanne: 10, // → 40..50 ≈ 45 um den Spieler herum
};

/** Ist der Gegner lange genug untätig, um neu platziert zu werden? */
export function nachsetzenFaellig(untaetig: number, cfg: NachsetzCfg = DEFAULT_NACHSETZ): boolean {
  return untaetig >= cfg.timeout;
}

/**
 * Neuplatzierungs-Punkt: zufällig RUNDUM den Spieler im Radius [distMin, distMin+distSpanne]. So landet
 * der Gegner direkt wieder nah am Spieler (egal wohin er fährt), statt weit voraus zu verschwinden.
 * `rng()` liefert 0..1 (injizierbar für Tests).
 */
export function spawnRundum(
  px: number,
  pz: number,
  rng: () => number,
  cfg: NachsetzCfg = DEFAULT_NACHSETZ,
): { x: number; z: number } {
  const ang = rng() * Math.PI * 2;
  const r = cfg.distMin + rng() * cfg.distSpanne;
  return { x: px + Math.cos(ang) * r, z: pz + Math.sin(ang) * r };
}
