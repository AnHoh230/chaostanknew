/** Reine Ziel-Mathematik (kein Babylon, voll unit-testbar). */

export interface XZ {
  x: number;
  z: number;
}

/** Yaw (rotation.y), sodass lokales +Z von (ox,oz) zum Ziel (tx,tz) zeigt. */
export function yawTo(ox: number, oz: number, tx: number, tz: number): number {
  return Math.atan2(tx - ox, tz - oz);
}

/**
 * Schnittpunkt eines Strahls (origin, dir) mit der Ebene y=0.
 * Liefert null, wenn der Strahl (nahezu) parallel zur Ebene verläuft oder nach
 * oben zeigt (kein Bodentreffer). Das ist die GROUND TRUTH des Cursors am Boden.
 */
export function rayGroundY0(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
): XZ | null {
  if (Math.abs(dy) < 1e-6) return null;
  const t = -oy / dy;
  if (t < 0) return null;
  return { x: ox + t * dx, z: oz + t * dz };
}
