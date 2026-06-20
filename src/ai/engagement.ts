/** Engagement-Modus eines Gegners (erste Fassung — Spec 2026-06-20). */
export type EngageMode = 'scout' | 'annähern' | 'feuern' | 'abstand' | 'fliehen';

export interface EngageInput {
  selfX: number;
  selfZ: number;
  target: { x: number; z: number; dist: number } | null; // null = kein Ziel in Sicht
  hpFrac: number;
  fireRange: number;
  keepDist: number;
  fleeHp: number;
  scoutDir: number; // aktuelles Scout-Heading (rad), wird von außen verwaltet
}

export interface EngageOutput {
  mode: EngageMode;
  moveX: number; // normierter Bewegungsvektor (0,0 = halten)
  moveZ: number;
  fire: boolean;
  faceX: number; // Punkt, auf den der Turm zeigt
  faceZ: number;
}

/**
 * Distanz → Modus + Bewegung + Feuer. Rein & deterministisch (Scout-Richtung kommt
 * von außen). Prüf-Reihenfolge = Priorität: scout → fliehen → annähern → abstand →
 * feuern. Koppelt die Reichweiten: Annähern hängt nur an „Ziel sichtbar & d>fireRange"
 * (keine separate Engage-Schwelle mehr → keine tote Zone).
 */
export function engagementStep(i: EngageInput): EngageOutput {
  const { selfX, selfZ, target, hpFrac, fireRange, keepDist, fleeHp, scoutDir } = i;

  if (!target) {
    const dx = Math.sin(scoutDir);
    const dz = Math.cos(scoutDir);
    return { mode: 'scout', moveX: dx, moveZ: dz, fire: false, faceX: selfX + dx * 10, faceZ: selfZ + dz * 10 };
  }

  const d = target.dist || 1;
  const toX = (target.x - selfX) / d;
  const toZ = (target.z - selfZ) / d;
  const inRange = d <= fireRange;
  const face = { faceX: target.x, faceZ: target.z };

  if (hpFrac < fleeHp) {
    return { mode: 'fliehen', moveX: -toX, moveZ: -toZ, fire: inRange, ...face };
  }
  if (d > fireRange) {
    return { mode: 'annähern', moveX: toX, moveZ: toZ, fire: false, ...face };
  }
  if (d < keepDist) {
    return { mode: 'abstand', moveX: -toX, moveZ: -toZ, fire: true, ...face };
  }
  return { mode: 'feuern', moveX: 0, moveZ: 0, fire: true, ...face };
}
