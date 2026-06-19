export interface TargetInfo {
  id: string;
  team: string;
  x: number;
  z: number;
  lootValue: number;
  alive: boolean;
}

/**
 * Beutewert-Jagd: aus den Kandidaten den lohnendsten lebenden Gegner-Team-Panzer
 * in Sichtweite wählen. Höchster lootValue gewinnt; bei Gleichstand der nähere.
 * Liefert null, wenn nichts Lohnendes in Sicht ist.
 */
export function pickTarget(
  selfX: number,
  selfZ: number,
  selfTeam: string,
  sight: number,
  candidates: readonly TargetInfo[],
): TargetInfo | null {
  let best: TargetInfo | null = null;
  let bestLoot = -Infinity;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!c.alive || c.team === selfTeam) continue;
    const dist = Math.hypot(c.x - selfX, c.z - selfZ);
    if (dist > sight) continue;
    if (c.lootValue > bestLoot || (c.lootValue === bestLoot && dist < bestDist)) {
      best = c;
      bestLoot = c.lootValue;
      bestDist = dist;
    }
  }
  return best;
}
