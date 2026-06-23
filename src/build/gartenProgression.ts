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
  interval: number; // s zwischen Spawn-Ticks — schrumpft über die Zeit (= Eskalation)
  batch: number; // Gegner pro Tick — wächst über die Zeit (1 → mehr)
  weights: Record<string, number>; // ENEMY_TYPES-IDs → relatives Spawn-Gewicht
  level: number; // Stärke-Stufe der einzelnen Gegner (skaliert ihre Stats)
  cap: number; // Safety-Obergrenze gleichzeitig lebender (selten erreicht; verhindert Runaway)
}

/** Zeit (s) → Spawn-Eskalation: Mix + Level schalten gestaffelt frei; Takt schrumpft, Batch wächst. */
export function gegnerWelle(t: number): GegnerWelle {
  // Typ-Mix + Stärke schalten langsam frei (Schwarm, dann Brocken).
  let weights: Record<string, number>;
  let level: number;
  if (t < 90) { weights = { allrounder: 1 }; level = 1; }
  else if (t < 210) { weights = { allrounder: 7, racer: 3 }; level = 1; }
  else if (t < 360) { weights = { allrounder: 5, racer: 3, swarm: 2 }; level = 2; }
  else if (t < 540) { weights = { allrounder: 4, racer: 3, swarm: 3, bunker: 1 }; level = 3; }
  else { weights = { allrounder: 2, racer: 3, swarm: 4, bunker: 2 }; level = 4 + Math.floor((t - 540) / 180); }
  // Spawn-Rate: Takt ~8s → schneller Früh-Abfall (tote Leere weg), Boden bei 4s → der Dot-Build
  // (Kills brauchen ~6,5s Reifezeit) bekommt Luft für eine sichere Tasche. Batch bleibt lang bei 1
  // (Einzel-Spawns, lesbar — „erst einer, dann einer"), wächst erst spät (+1 alle 5 min). Die
  // Letalität kommt übers Gegner-LEVEL (tankiger/härter), nicht über eine Body-Flut.
  const interval = Math.max(4.0, 1.5 + 6.5 * Math.exp(-t / 100));
  const batch = 1 + Math.floor(t / 300);
  return { interval, batch, weights, level, cap: 50 };
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
