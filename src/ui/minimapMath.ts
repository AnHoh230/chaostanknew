export interface BlipPos {
  x: number; // Minimap-Pixel
  y: number;
  inRange: boolean;
}

/**
 * Welt-Position relativ zum Spieler auf Minimap-Pixel abbilden.
 * Spieler ist die Mitte; +Z zeigt nach oben (Norden). Außerhalb der Reichweite
 * wird inRange=false gemeldet (Aufrufer blendet den Blip aus).
 */
export function projectBlip(
  px: number,
  pz: number,
  wx: number,
  wz: number,
  rangeWorld: number,
  sizePx: number,
): BlipPos {
  const half = sizePx / 2;
  const x = ((wx - px) / rangeWorld) * half + half;
  const y = half - ((wz - pz) / rangeWorld) * half; // +Z = oben
  const inRange = Math.hypot(wx - px, wz - pz) <= rangeWorld;
  return { x, y, inRange };
}
