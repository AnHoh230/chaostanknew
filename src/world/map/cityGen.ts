/**
 * Stadt-Generator (Generator-Hirn, Zusammenbau): die komplette Schleife
 *   seed -> Module SEED-abhängig platzieren -> mit Straßen verbinden -> zu Entities stempeln
 *   -> KartenDaten.
 * Rein/deterministisch (alle Schritte sind reine Module), separat getestet. Rendering (Boden,
 * Straßen-Mesh) hängt der Aufrufer dran — hier entsteht nur die Daten-Karte.
 */
import type { KartenDaten, MapPath } from './mapTypes';
import { createRng } from '../../core/rng';
import { platziere, weltAABB, type Platzierung } from './modulePlacement';
import { verbinde, type RoadSegment } from './moduleRoads';
import { stempleModul } from './moduleStamp';
import { createGate, STANDARD_CAPS, type SpawnCaps } from './moduleCaps';
import type { ModulDef } from './muster';

export interface BlockRect {
  id: string; theme: string;
  x: number; z: number; w: number; h: number; // Welt-Mittelpunkt + Größe
}

export interface StadtKarte extends KartenDaten {
  roads: RoadSegment[];
  blockRects: BlockRect[];
  roadZellen: string[]; // "col,row"-Straßenzellen für den Boden-Brush
}

export interface StadtOpt {
  extents: { halfX: number; halfZ: number };
  cellSize: number;
  module: ModulDef[]; // Einkaufsliste, Reihenfolge = Priorität (Major zuerst, Hub als [0])
  caps?: SpawnCaps;
  clearanceCells?: number;
  roadBreiteZellen?: number;
  biomeId?: string;
}

export function generiereStadt(opt: StadtOpt, seed: number): StadtKarte {
  const cs = opt.cellSize;
  const placements: Platzierung[] = platziere(opt.module, seed, {
    extents: opt.extents, cellSize: cs, clearanceCells: opt.clearanceCells,
  });
  const netz = verbinde(placements, {
    extents: opt.extents, cellSize: cs, breiteZellen: opt.roadBreiteZellen,
  });

  const gate = createGate(opt.caps ?? STANDARD_CAPS);
  const rng = createRng((seed ^ 0x9e3779b1) >>> 0); // eigener rng-Strom fürs Stempeln
  const entities = placements.flatMap((p, i) => stempleModul(p, cs, i, rng, gate));

  const paths: MapPath[] = netz.segmente.map((s, i) => ({
    id: `road_${i}`, punkte: [s.von, s.bis], breite: s.breite,
  }));
  const blockRects: BlockRect[] = placements.map((p, i) => {
    const b = weltAABB(p, cs, 0);
    return {
      id: `block_${i}`, theme: p.def.theme,
      x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2,
      w: b.maxX - b.minX, h: b.maxZ - b.minZ,
    };
  });

  return {
    rezeptId: 'stadt', seed, biomeId: opt.biomeId ?? 'schrottfeld',
    extents: opt.extents, spawn: { x: 0, z: 0 },
    zones: [], paths, entities, valid: placements.length > 0, warnungen: [],
    roads: netz.segmente, blockRects, roadZellen: [...netz.zellen],
  };
}
