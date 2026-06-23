/**
 * Aggregierte Lage der Gegner RELATIV zum Spieler — macht „Davonfahr-" und „Steh-"
 * Exploits im Log sichtbar, ohne jede Gegnerposition einzeln zu loggen.
 *
 * - front/side/back: Gegner-Zahl im vorderen (±60°)/seitlichen/hinteren Sektor BEZOGEN auf
 *   die Fahrtrichtung. Nur wenn der Spieler fährt (sonst ist „vorne" undefiniert → alle 0).
 *   Davonfahren zeigt sich als back ≫ front.
 * - near: Gegner innerhalb nearR (Nahbereich). inRange: Gegner in Gegner-Schussweite.
 *   Stehen zeigt sich als near/inRange > 0 bei gleichzeitig ~0 erlittenem Schaden (Seuche killt sie).
 * - nearest: Abstand des nächsten Gegners (−1 = keine Gegner).
 *
 * Reine Funktion (TDD).
 */
export interface EnemyRel {
  front: number;
  side: number;
  back: number;
  near: number;
  inRange: number;
  nearest: number;
}

export interface RelPoint { x: number; z: number; }

export const MOVING_SPEED = 1; // ab dieser Geschwindigkeit gilt der Spieler als „fahrend"
export const FRONT_COS = 0.5; // cos(60°): Sektorbreite vorne/hinten

export function enemyRelative(
  px: number,
  pz: number,
  vx: number,
  vz: number,
  enemies: readonly RelPoint[],
  fireRange: number,
  nearR = 50,
): EnemyRel {
  const speed = Math.hypot(vx, vz);
  const moving = speed > MOVING_SPEED;
  const dirX = moving ? vx / speed : 0;
  const dirZ = moving ? vz / speed : 0;
  let front = 0, side = 0, back = 0, near = 0, inRange = 0, nearest = Infinity;
  for (const e of enemies) {
    const dx = e.x - px, dz = e.z - pz;
    const d = Math.hypot(dx, dz);
    if (d < nearest) nearest = d;
    if (d <= nearR) near++;
    if (d <= fireRange) inRange++;
    if (moving && d > 1e-3) {
      const cos = (dx * dirX + dz * dirZ) / d; // cos(Winkel zur Fahrtrichtung)
      if (cos > FRONT_COS) front++;
      else if (cos < -FRONT_COS) back++;
      else side++;
    }
  }
  return { front, side, back, near, inRange, nearest: enemies.length ? Math.round(nearest) : -1 };
}
