export interface TargetInfo {
  id: string;
  team: string;
  x: number;
  z: number;
  lootValue: number;
  alive: boolean;
}

/**
 * Beutewert-Jagd mit Nähe-Gewichtung: Ziel = höchster `lootValue / (1 + dist·k)`
 * unter den lebenden Panzern fremder Fraktion in Sicht. Dadurch schlägt ein nahes,
 * lohnendes Ziel ein weit entferntes — es entstehen lokale Scharmützel statt
 * „alle rennen den Spieler an". Bei gleichem Beutewert gewinnt weiterhin der nähere.
 */
const DIST_K = 0.4;

export function pickTarget(
  selfX: number,
  selfZ: number,
  selfTeam: string,
  sight: number,
  candidates: readonly TargetInfo[],
): TargetInfo | null {
  let best: TargetInfo | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (!c.alive || c.team === selfTeam) continue;
    const dist = Math.hypot(c.x - selfX, c.z - selfZ);
    if (dist > sight) continue;
    const score = c.lootValue / (1 + dist * DIST_K);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}
