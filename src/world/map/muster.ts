/**
 * Muster-Leser (Generator-Hirn, Schritt 1): liest ein Modul-Raster (ASCII) ein, validiert es,
 * und transformiert es (Rotation in 90°-Schritten + Spiegelung). Rein — kein Engine-Bezug,
 * separat getestet. Die Platzierung nutzt Footprint + Anschlüsse, das Stempeln die Zellen.
 *
 * Glyphen-Sprache (Prop-Layer, semantisch — Asset entscheidet das Thema beim Stempeln):
 *   .  Boden    ,  Deko    #  Wand    B  Cargo    o  Breakable    X  Hazard
 *   *  Pickup   !  Fokus   n  Nest    =  Tor      r  Strasse      ~  weicher Boden
 *   t  Baum     ' ' leer
 */
import type { Vec2 } from './mapTypes';

export type ModulRolle = 'major' | 'connector' | 'filler';
export type Seite = 'N' | 'O' | 'S' | 'W';
export type WandModus = 'none' | 'pattern';
export type AnschlussArt = 'road' | 'roadGate' | 'serviceGate' | 'dirtRoad';

export interface ModulAnschluss {
  seite: Seite;
  art: AnschlussArt;
}

export interface ModulDef {
  id: string;
  rolle: ModulRolle;
  theme: string; // BlockTheme | 'road' | 'checkpoint' | 'any'
  rows: string[]; // Prop-Layer
  kosten: number;
  wand: WandModus;
  anschluesse: ModulAnschluss[];
  drehbar: boolean;
  spiegelbar: boolean;
  nestSlotsMax?: number;
  pickupSlotsMax?: number;
  hazardSlotsMax?: number;
}

export type ZellArt =
  | 'leer' | 'boden' | 'deko' | 'wand' | 'cargo' | 'breakable'
  | 'hazard' | 'pickup' | 'fokus' | 'nest' | 'tor' | 'strasse' | 'baum';

export interface MusterGitter {
  w: number; // Spalten
  h: number; // Zeilen
  zellen: string[]; // Länge h*w, row-major (Zeile * w + Spalte)
}

const GLYPH: Record<string, ZellArt> = {
  '.': 'boden', ' ': 'leer', "'": 'leer',
  ',': 'deko', 't': 'baum',
  '#': 'wand', 'B': 'cargo', 'o': 'breakable',
  'X': 'hazard', '*': 'pickup', '!': 'fokus', 'n': 'nest',
  '=': 'tor', 'r': 'strasse', '~': 'boden',
};

export function glyphArt(ch: string): ZellArt {
  return GLYPH[ch] ?? 'leer';
}

/** Liest die ASCII-Zeilen ein und stellt sicher, dass das Raster rechteckig ist. */
export function parseMuster(rows: string[]): MusterGitter {
  const h = rows.length;
  if (h === 0) throw new Error('Muster ohne Zeilen');
  const w = rows[0]!.length;
  if (w === 0) throw new Error('Muster mit leerer Zeile');
  for (const r of rows) {
    if (r.length !== w) throw new Error(`Muster-Zeilen ungleich lang: erwartet ${w}, fand ${r.length}`);
  }
  const zellen: string[] = [];
  for (const r of rows) for (const ch of r) zellen.push(ch);
  return { w, h, zellen };
}

export function zelleBei(g: MusterGitter, col: number, row: number): string {
  return g.zellen[row * g.w + col]!;
}

function rot90cw(g: MusterGitter): MusterGitter {
  const W = g.w, H = g.h;
  const nw = H, nh = W;
  const zellen = new Array<string>(nw * nh).fill(' ');
  for (let or = 0; or < H; or++) {
    for (let oc = 0; oc < W; oc++) {
      const nc = H - 1 - or;
      const nr = oc;
      zellen[nr * nw + nc] = g.zellen[or * W + oc]!;
    }
  }
  return { w: nw, h: nh, zellen };
}

function mirrorX(g: MusterGitter): MusterGitter {
  const zellen = new Array<string>(g.w * g.h);
  for (let r = 0; r < g.h; r++) {
    for (let c = 0; c < g.w; c++) {
      zellen[r * g.w + (g.w - 1 - c)] = g.zellen[r * g.w + c]!;
    }
  }
  return { w: g.w, h: g.h, zellen };
}

/** Spiegelung (X) zuerst, dann `rot` 90°-Drehungen im Uhrzeigersinn. */
export function transform(g: MusterGitter, rot: 0 | 1 | 2 | 3, mirror: boolean): MusterGitter {
  let res = mirror ? mirrorX(g) : g;
  for (let i = 0; i < rot; i++) res = rot90cw(res);
  return res;
}

const CW: Record<Seite, Seite> = { N: 'O', O: 'S', S: 'W', W: 'N' };
const SPIEGEL_X: Record<Seite, Seite> = { N: 'N', S: 'S', O: 'W', W: 'O' };

/** Wohin zeigt eine Anschluss-Seite nach derselben Transformation wie das Raster? */
export function seiteTransform(s: Seite, rot: 0 | 1 | 2 | 3, mirror: boolean): Seite {
  let x = mirror ? SPIEGEL_X[s] : s;
  for (let i = 0; i < rot; i++) x = CW[x];
  return x;
}

/** Footprint (Spalten × Zeilen) NACH Drehung — bei 90°/270° vertauscht. */
export function footprint(def: ModulDef, rot: 0 | 1 | 2 | 3): { w: number; h: number } {
  const g = parseMuster(def.rows);
  return rot % 2 === 0 ? { w: g.w, h: g.h } : { w: g.h, h: g.w };
}

/** Mittelpunkt der an `seite` liegenden Kante eines Footprints (Zellkoordinaten). */
export function anschlussZelle(w: number, h: number, seite: Seite): Vec2 {
  switch (seite) {
    case 'N': return { x: (w - 1) / 2, z: 0 };
    case 'S': return { x: (w - 1) / 2, z: h - 1 };
    case 'W': return { x: 0, z: (h - 1) / 2 };
    case 'O': return { x: w - 1, z: (h - 1) / 2 };
  }
}
