/**
 * Modul-Platzierung (Generator-Hirn, Schritt 3): verteilt eine Einkaufsliste von Modulen
 * SEED-abhängig auf der Spielwiese — überlappungsfrei, vollständig in den Extents, mit Luft
 * (Clearance) drumherum. Es wird NICHT die ganze Fläche gefüllt; der Rest bleibt bewusst frei
 * (Budget < Fläche). Rein, deterministisch, separat getestet.
 */
import { createRng } from '../../core/rng';
import type { Vec2 } from './mapTypes';
import { footprint, type ModulDef, type Seite } from './muster';

export interface Platzierung {
  def: ModulDef;
  rot: 0 | 1 | 2 | 3;
  mirror: boolean;
  cx: number; // Welt-Mittelpunkt X
  cz: number; // Welt-Mittelpunkt Z
  wCells: number; // Footprint-Spalten nach Drehung
  hCells: number; // Footprint-Zeilen nach Drehung
}

export interface PlatzierOpt {
  extents: { halfX: number; halfZ: number };
  cellSize: number;
  clearanceCells?: number; // Luft rings ums Modul (Default 2)
  maxTries?: number; // Versuche je Modul (Default 60)
  spawnFreiRadius?: number; // hält einen Bereich um den Ursprung (Spawn) modulfrei
}

interface AABB { minX: number; maxX: number; minZ: number; maxZ: number; }

function weltGroesse(p: Platzierung, cs: number): { w: number; h: number } {
  return { w: p.wCells * cs, h: p.hCells * cs };
}

/** Welt-AABB eines platzierten Moduls, optional um `pad` (Welt-Einheiten) erweitert. */
export function weltAABB(p: Platzierung, cs: number, pad = 0): AABB {
  const g = weltGroesse(p, cs);
  return {
    minX: p.cx - g.w / 2 - pad, maxX: p.cx + g.w / 2 + pad,
    minZ: p.cz - g.h / 2 - pad, maxZ: p.cz + g.h / 2 + pad,
  };
}

function ueberlappt(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/**
 * Verteilt `module` (Reihenfolge = Priorität: Pflicht/Major zuerst) deterministisch.
 * Module, die nach `maxTries` keinen freien Platz finden oder größer als das Feld sind,
 * werden ausgelassen (nicht kaputt geklippt).
 */
export function platziere(module: ModulDef[], seed: number, opt: PlatzierOpt): Platzierung[] {
  const cs = opt.cellSize;
  const clear = (opt.clearanceCells ?? 2) * cs;
  const maxTries = opt.maxTries ?? 60;
  const rng = createRng(seed);
  const platziert: Platzierung[] = [];
  const belegt: AABB[] = [];

  // Spawn-Zone um den Ursprung freihalten -> Panzer startet nicht in einem Modul.
  if (opt.spawnFreiRadius && opt.spawnFreiRadius > 0) {
    const r = opt.spawnFreiRadius;
    belegt.push({ minX: -r, maxX: r, minZ: -r, maxZ: r });
  }

  for (const def of module) {
    let gesetzt = false;
    for (let versuch = 0; versuch < maxTries && !gesetzt; versuch++) {
      const rot: 0 | 1 | 2 | 3 = def.drehbar ? (rng.int(4) as 0 | 1 | 2 | 3) : 0;
      const mirror = def.spiegelbar ? rng.next() < 0.5 : false;
      const fp = footprint(def, rot);
      const ww = fp.w * cs, wh = fp.h * cs;
      const grenzX = opt.extents.halfX - ww / 2;
      const grenzZ = opt.extents.halfZ - wh / 2;
      if (grenzX < 0 || grenzZ < 0) break; // Modul größer als das Feld -> auslassen
      const cand: Platzierung = {
        def, rot, mirror, wCells: fp.w, hCells: fp.h,
        cx: rng.range(-grenzX, grenzX),
        cz: rng.range(-grenzZ, grenzZ),
      };
      const box = weltAABB(cand, cs, clear / 2);
      if (belegt.some((b) => ueberlappt(box, b))) continue;
      platziert.push(cand);
      belegt.push(weltAABB(cand, cs, clear / 2));
      gesetzt = true;
    }
  }
  return platziert;
}

/** Welt-Punkt eines Anschlusses (Kantenmitte) nach Drehung/Spiegelung — Start/Ziel für Straßen.
 *  Konvention: N=+Z, O=+X, S=-Z, W=-X. */
export function anschlussWeltpunkt(p: Platzierung, seite: Seite, cs: number): Vec2 {
  const halfW = (p.wCells * cs) / 2;
  const halfH = (p.hCells * cs) / 2;
  switch (seite) {
    case 'N': return { x: p.cx, z: p.cz + halfH };
    case 'O': return { x: p.cx + halfW, z: p.cz };
    case 'S': return { x: p.cx, z: p.cz - halfH };
    case 'W': return { x: p.cx - halfW, z: p.cz };
  }
}
