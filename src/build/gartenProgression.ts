/**
 * Garten-Test-Progression (zeit-getrieben). ZWEI Kurven auf EINER Zeitachse, die gegeneinander
 * laufen — das ist der eigentliche Test „trägt der Build-Aufbau gegen den Druck":
 *  - buildStufe(t): wie weit der Spieler seinen ZZZ-Build ausgebildet hat
 *    (0 Grundschuss → 1 Z Gift → 2 ZZ Seuche → 3 ZZZ Ernte → 4+ Verstärkung).
 *  - gegnerWelle(t): was gleichzeitig auf dem Feld steht (Menge, Typ-Mix, Level, Spawn-Takt).
 *
 * Kompass zeigt fest auf dot (alles zahlt auf ZZZ ein) — für den Test schalten die Stufen rein über
 * die Zeit frei, damit beide Kurven sauber justierbar sind. Reine Funktionen, kein Engine-Bezug (TDD);
 * die Sekunden/Mengen/Faktoren sind alle nur Drehregler.
 */

/** Ab dieser Laufzeit (s) ist die jeweilige Stufe ausgebildet. Danach alle 90 s eine Verstärkung. */
export const BUILD_STUFE_AB = [0, 25, 70, 130, 210];
export const BUILD_STUFE_NAME = ['Grundschuss', 'Z · Gift', 'ZZ · Seuche', 'ZZZ · Ernte', 'Verstärkung'];

/** Zeit (s) → ausgebildete Build-Stufe. 0 = Grundschuss … 3 = ZZZ, 4+ = Verstärkung. */
export function buildStufe(t: number): number {
  if (t < 25) return 0;
  if (t < 70) return 1;
  if (t < 130) return 2;
  if (t < 210) return 3;
  return 4 + Math.floor((t - 210) / 90);
}

export interface GegnerWelle {
  targetCount: number; // so viele Gegner sollen gleichzeitig leben
  weights: Record<string, number>; // ENEMY_TYPES-IDs → relatives Spawn-Gewicht
  level: number; // Stärke-Stufe der einzelnen Gegner (skaliert ihre Stats)
  interval: number; // s zwischen Spawns
}

/** Zeit (s) → was auf dem Feld stehen soll. An die buildStufe-Schwellen ausgerichtet (Wettrennen). */
export function gegnerWelle(t: number): GegnerWelle {
  if (t < 25) return { targetCount: 6, weights: { allrounder: 1 }, level: 1, interval: 1.4 };
  if (t < 70) return { targetCount: 7, weights: { allrounder: 1 }, level: 1, interval: 1.3 };
  if (t < 130) return { targetCount: 9, weights: { allrounder: 6, racer: 4 }, level: 2, interval: 1.1 };
  if (t < 210) return { targetCount: 12, weights: { allrounder: 4, racer: 3, swarm: 3, bunker: 1 }, level: 3, interval: 0.9 };
  // ab 3:30 — Endlos-Eskalation: mehr, fieser (Schwarm-lastig), stärker, schnellerer Nachschub.
  const over = t - 210;
  const step = Math.floor(over / 60);
  return {
    targetCount: Math.min(30, 16 + step * 2),
    weights: { allrounder: 2, racer: 3, swarm: 4, bunker: 2 },
    level: 3 + Math.floor(over / 90),
    interval: Math.max(0.5, 0.9 - step * 0.05),
  };
}

export interface GartenTypStats {
  hp: number;
  damage: number;
  speed: number;
}

/** Basis-Stats pro Typ (Level 1). Charakter steckt im Typ; das Level skaliert hoch. */
export const GARTEN_BASIS: Record<string, GartenTypStats> = {
  allrounder: { hp: 75, damage: 14, speed: 8 },
  racer: { hp: 55, damage: 16, speed: 12 },
  swarm: { hp: 35, damage: 8, speed: 9 },
  bunker: { hp: 220, damage: 40, speed: 5 },
};

/** Typ-Basis auf ein Level hochskalieren: HP ×1.15, Schaden ×1.18, Tempo ×1.04 je Level über 1. */
export function gartenTypStats(typ: string, level: number): GartenTypStats {
  const b = GARTEN_BASIS[typ] ?? GARTEN_BASIS.allrounder!;
  const n = Math.max(0, level - 1);
  return {
    hp: Math.round(b.hp * Math.pow(1.15, n)),
    damage: Math.round(b.damage * Math.pow(1.18, n)),
    speed: +(b.speed * Math.pow(1.04, n)).toFixed(2),
  };
}

/** Wie viele eines Typs als Pulk auf EINEN Punkt spawnen. Schwarm kommt als Haufen, Rest einzeln. */
export function pulkGroesse(typ: string): number {
  return typ === 'swarm' ? 5 : 1;
}
