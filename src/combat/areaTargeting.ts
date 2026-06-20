/** Reine Flächen-/Ziel-Mathematik für Debuffs (Zielmarkierung, Rauch). Kein Babylon. */

export interface AreaPt {
  id: string;
  x: number;
  z: number;
}

/** Nächster Punkt zu (x,z) innerhalb der Reichweite — oder null, wenn keiner in Reichweite. */
export function nearestInRange(
  x: number,
  z: number,
  pts: readonly AreaPt[],
  range: number,
): AreaPt | null {
  let best: AreaPt | null = null;
  let bestD = Infinity;
  for (const p of pts) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d <= range && d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** IDs aller Punkte innerhalb des Radius um (x,z). */
export function idsWithinRadius(
  x: number,
  z: number,
  pts: readonly AreaPt[],
  radius: number,
): string[] {
  const out: string[] = [];
  for (const p of pts) {
    if (Math.hypot(p.x - x, p.z - z) <= radius) out.push(p.id);
  }
  return out;
}
