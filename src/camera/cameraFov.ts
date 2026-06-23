/**
 * FOV ans Seitenverhältnis koppeln, damit ein breiterer/größerer Bildschirm NICHT
 * mehr Welt sieht (Fairness). Die Kamera ist vertikal-FOV-fix (Babylon-Default) →
 * die horizontale Sicht wächst mit dem Aspect. Wir kappen das: ab einem Referenz-
 * Aspect (16:9) wird die vertikale FOV so reduziert, dass die sichtbare horizontale
 * BREITE konstant bleibt (gleicher Welt-Ausschnitt wie bei 16:9). Schmalere Displays
 * als die Referenz behalten die Basis-FOV (kein vertikales Über-Sehen).
 *
 * Reine Funktion (TDD), kein Engine-Bezug. `baseFov` = vertikale FOV in Radiant.
 */
export const REF_ASPECT = 16 / 9;

/** Untergrenze für die vertikale FOV bei extrem breiten Displays (Super-Ultrawide). */
export const MIN_FOV_FACTOR = 0.6;

export function fovForAspect(baseFov: number, aspect: number, refAspect = REF_ASPECT): number {
  if (!Number.isFinite(aspect) || aspect <= refAspect) return baseFov;
  // hFov konstant halten: tan(vFov/2) = tan(baseFov/2) · refAspect / aspect.
  const vFov = 2 * Math.atan(Math.tan(baseFov / 2) * (refAspect / aspect));
  return Math.max(baseFov * MIN_FOV_FACTOR, vFov);
}
