/**
 * Körper-Kollision: schiebt den Panzer-Mittelpunkt aus massiven Props (Wracks, Fässer,
 * Wahrzeichen) heraus, statt ihn hindurchfahren zu lassen. Reine Geometrie — in main.ts
 * pro Frame über die aktiven, soliden Map-Entities aufgerufen, separat getestet.
 */
export interface Kreis {
  x: number;
  z: number;
  r: number;
}

/**
 * Löst Überlappungen zwischen Spieler-Kreis (Radius spielerR) und Hindernis-Kreisen auf,
 * indem der Spieler entlang der Trennachse genau bis zur Berührung herausgeschoben wird.
 * Mehrere Iterationen lösen Klemmen in Ecken zwischen zwei Hindernissen.
 */
export function loeseKollision(
  px: number,
  pz: number,
  spielerR: number,
  hindernisse: Kreis[],
  iterationen = 3,
): { x: number; z: number } {
  let x = px;
  let z = pz;
  for (let it = 0; it < iterationen; it++) {
    let bewegt = false;
    for (const h of hindernisse) {
      const dx = x - h.x;
      const dz = z - h.z;
      const minDist = spielerR + h.r;
      const d = Math.hypot(dx, dz);
      if (d >= minDist) continue;
      if (d < 1e-4) {
        // Exakt im Zentrum (sonst Division durch 0): deterministisch nach +X herausschieben.
        x = h.x + minDist;
        z = h.z;
        bewegt = true;
        continue;
      }
      const schub = (minDist - d) / d;
      x += dx * schub;
      z += dz * schub;
      bewegt = true;
    }
    if (!bewegt) break;
  }
  return { x, z };
}
