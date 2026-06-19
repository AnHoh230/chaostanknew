export interface TilePos {
  x: number;
  z: number;
}

/** Steht der Punkt (px,pz) auf irgendeinem Shop-Feld (Mittelpunktabstand <= reach)? */
export function onAnyTile(tiles: readonly TilePos[], px: number, pz: number, reach: number): boolean {
  for (const t of tiles) {
    if (Math.hypot(t.x - px, t.z - pz) <= reach) return true;
  }
  return false;
}

/** Nächstes Shop-Feld zu (px,pz) inkl. Distanz — oder null, wenn keine Felder. */
export function nearestTile(
  tiles: readonly TilePos[],
  px: number,
  pz: number,
): { x: number; z: number; dist: number } | null {
  let best: { x: number; z: number; dist: number } | null = null;
  for (const t of tiles) {
    const d = Math.hypot(t.x - px, t.z - pz);
    if (!best || d < best.dist) best = { x: t.x, z: t.z, dist: d };
  }
  return best;
}
