/**
 * Rezept = Vorgaben, nach denen der Generator eine Karte baut (Biom, Größe, Zonen, Dichten,
 * Pflicht-Set-Pieces, Pfade). Benannte Rezepte sind die Eingabe des Autoren-Werkzeugs.
 */
import type { ZoneTheme, EntityKind } from './mapTypes';

export interface DichteRegel {
  theme: ZoneTheme;
  breakables: [number, number]; // [min, max]
  obstacles: [number, number];
  decor: [number, number];
  collectibles: [number, number];
}

export interface Rezept {
  id: string;
  biomeId: string;
  extents: { halfX: number; halfZ: number };
  zonen: { theme: ZoneTheme; gewicht: number }[];
  zonenAnzahl: [number, number];
  dichte: DichteRegel[];
  pflichtSetpieces: EntityKind[];
  hazardAnzahl: [number, number];
  nestAnzahl: [number, number];
  pfadBreite: number;
  minAbstand: number; // globaler Boden-Mindestabstand bei der Platzierung
}

export const REZEPTE: Record<string, Rezept> = {};

export function registerRezept(r: Rezept): void {
  REZEPTE[r.id] = r;
}

export function getRezept(id: string): Rezept {
  const r = REZEPTE[id];
  if (!r) throw new Error('Unknown recipe: ' + id); // kein stiller Fallback
  return r;
}

registerRezept({
  id: 'schrottfeld',
  biomeId: 'schrottfeld',
  extents: { halfX: 320, halfZ: 320 },
  zonen: [
    { theme: 'offenerHof', gewicht: 3 },
    { theme: 'wrackCluster', gewicht: 3 },
    { theme: 'pressWerk', gewicht: 2 },
    { theme: 'funkturmZone', gewicht: 2 },
  ],
  zonenAnzahl: [4, 4],
  dichte: [
    { theme: 'offenerHof', breakables: [3, 6], obstacles: [1, 3], decor: [3, 6], collectibles: [1, 3] },
    { theme: 'wrackCluster', breakables: [6, 10], obstacles: [3, 6], decor: [4, 8], collectibles: [1, 3] },
    { theme: 'pressWerk', breakables: [2, 4], obstacles: [2, 4], decor: [2, 4], collectibles: [0, 2] },
    { theme: 'funkturmZone', breakables: [2, 4], obstacles: [1, 3], decor: [2, 4], collectibles: [1, 2] },
  ],
  pflichtSetpieces: ['landmark', 'dormantNest', 'hazard', 'secretRamp'],
  hazardAnzahl: [1, 2],
  nestAnzahl: [1, 2],
  pfadBreite: 14,
  minAbstand: 4,
});
