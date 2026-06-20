export interface ScreenBlip {
  id: string;
  sx: number;
  sy: number;
}

/**
 * Gegner unter dem Mauszeiger: nächster Bildschirm-Blip zu (px,py) innerhalb
 * maxPx — sonst null. Bei Gleichstand gewinnt der erste in der Liste.
 */
export function nearestToPointer(
  px: number,
  py: number,
  blips: readonly ScreenBlip[],
  maxPx: number,
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const b of blips) {
    const d = Math.hypot(b.sx - px, b.sy - py);
    if (d <= maxPx && d < bestDist) {
      bestDist = d;
      bestId = b.id;
    }
  }
  return bestId;
}
