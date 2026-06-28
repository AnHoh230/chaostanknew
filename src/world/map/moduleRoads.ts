/**
 * Wegzeichner (Generator-Hirn, Schritt 4): verbindet die platzierten Module mit Straßen.
 * Kein Mathe-Strich — ein Spannbaum (nächster Nachbar) liefert die Verbindungen, jede wird
 * als L-förmiger ZELLPFAD mit Breite „gemalt" (Road-Brush), sodass eine erkennbare Straße
 * entsteht statt einer dünnen Diagonale. Endpunkte sind die Modul-Anschlüsse. Alle Module
 * sind vom Hub (Modul 0) aus erreichbar. Rein, deterministisch, separat getestet.
 */
import type { Vec2 } from './mapTypes';
import { seiteTransform } from './muster';
import { anschlussWeltpunkt, type Platzierung } from './modulePlacement';

export interface RoadSegment { von: Vec2; bis: Vec2; breite: number; }
export interface RoadNetz {
  segmente: RoadSegment[];
  kanten: [number, number][]; // Modul-Index-Paare des Spannbaums (für Erreichbarkeit/Test)
  zellen: Set<string>; // gemalte Straßenzellen "col,row"
}

export interface RoadOpt {
  extents: { halfX: number; halfZ: number };
  cellSize: number;
  breiteZellen?: number; // Straßenbreite in Zellen (Default 2)
}

function zentrum(p: Platzierung): Vec2 {
  return { x: p.cx, z: p.cz };
}
function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Anschluss-Weltpunkt, der dem Ziel am nächsten liegt (sonst Modul-Mittelpunkt). */
function besterAnschluss(p: Platzierung, ziel: Vec2, cs: number): Vec2 {
  if (p.def.anschluesse.length === 0) return zentrum(p);
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (const a of p.def.anschluesse) {
    const seite = seiteTransform(a.seite, p.rot, p.mirror);
    const pt = anschlussWeltpunkt(p, seite, cs);
    const d = dist2(pt, ziel);
    if (d < bestD) { bestD = d; best = pt; }
  }
  return best ?? zentrum(p);
}

export function verbinde(module: Platzierung[], opt: RoadOpt): RoadNetz {
  const cs = opt.cellSize;
  const breite = opt.breiteZellen ?? 2;
  const cols = Math.max(1, Math.ceil((2 * opt.extents.halfX) / cs));
  const rows = Math.max(1, Math.ceil((2 * opt.extents.halfZ) / cs));
  const zellen = new Set<string>();
  const segmente: RoadSegment[] = [];
  const kanten: [number, number][] = [];
  const n = module.length;
  if (n <= 1) return { segmente, kanten, zellen };

  const weltZuZelle = (p: Vec2): { col: number; row: number } => ({
    col: Math.min(cols - 1, Math.max(0, Math.round((p.x + opt.extents.halfX) / cs))),
    row: Math.min(rows - 1, Math.max(0, Math.round((p.z + opt.extents.halfZ) / cs))),
  });
  const malBreit = (col: number, row: number): void => {
    const r = Math.floor(breite / 2);
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        const c = col + dc, rr = row + dr;
        if (c >= 0 && c < cols && rr >= 0 && rr < rows) zellen.add(c + ',' + rr);
      }
    }
  };
  const maleLPfad = (a: Vec2, b: Vec2): void => {
    const ca = weltZuZelle(a), cb = weltZuZelle(b);
    const stepC = Math.sign(cb.col - ca.col);
    let col = ca.col;
    while (col !== cb.col) { malBreit(col, ca.row); col += stepC; }
    const stepR = Math.sign(cb.row - ca.row);
    let row = ca.row;
    while (row !== cb.row) { malBreit(cb.col, row); row += stepR; }
    malBreit(cb.col, cb.row);
  };

  // Spannbaum (Prim, nächster Mittelpunkt) — Modul 0 ist der Hub.
  const verbunden = new Set<number>([0]);
  while (verbunden.size < n) {
    let bi = -1, bj = -1, bd = Infinity;
    for (const i of verbunden) {
      for (let j = 0; j < n; j++) {
        if (verbunden.has(j)) continue;
        const d = dist2(zentrum(module[i]!), zentrum(module[j]!));
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
    }
    if (bj < 0) break;
    verbunden.add(bj);
    kanten.push([bi, bj]);
    const a = besterAnschluss(module[bi]!, zentrum(module[bj]!), cs);
    const b = besterAnschluss(module[bj]!, zentrum(module[bi]!), cs);
    segmente.push({ von: a, bis: b, breite: breite * cs });
    maleLPfad(a, b);
  }
  return { segmente, kanten, zellen };
}
