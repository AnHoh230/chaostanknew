/**
 * Straßen-Topologie (rein, getestet): wählt für eine Straßenzelle anhand ihrer 4 Nachbarn das
 * passende Tile (gerade/Kurve/T/Kreuz/Ende) + Rotation. So sehen die Wege „asset-generiert" aus
 * statt wie ein Mathe-Strich — Geraden laufen durch, an Knicken sitzen Kurven, an Verzweigungen
 * T/Kreuz.
 *
 * Richtungs-Index passend zur Welt (N=+Z, O=+X, S=−Z, W=−X) und zum Zellraster des Painters
 * (Zeile row wächst nach +Z = Norden):  0=N, 1=O, 2=S, 3=W.
 *
 * WICHTIG: nur korrekt auf EINEN Zelle breiten Straßen — bei 2 Zellen Breite würde jede Zelle als
 * T erkannt (die Parallelspur ist ein Nachbar). Drum rendert der Aufrufer Topologie auf Breite 1.
 */
export type RoadKind = 'gerade' | 'kurve' | 't' | 'kreuz' | 'ende';

/** Kanonische Anschluss-Richtungen je Basis-Tile (vor Rotation), als Richtungs-Indizes. */
const BASIS: Record<RoadKind, number[]> = {
  gerade: [0, 2], // N–S (verifiziert: road_gerade)
  kurve: [0, 1], // N+O (verifiziert: road_kurve)
  t: [1, 2, 3], // O+S+W, zu nach N (verifiziert: road_t)
  kreuz: [0, 1, 2, 3], // 4-Wege
  ende: [2], // offen S (verifiziert: road_ende)
};

const zelle = (col: number, row: number): string => `${col},${row}`;

/** Bitmaske der vorhandenen Straßen-Nachbarn (Bit 0=N,1=O,2=S,3=W). */
export function maskeFuer(zellen: Set<string>, col: number, row: number): number {
  let m = 0;
  if (zellen.has(zelle(col, row + 1))) m |= 1 << 0; // N (+Z)
  if (zellen.has(zelle(col + 1, row))) m |= 1 << 1; // O (+X)
  if (zellen.has(zelle(col, row - 1))) m |= 1 << 2; // S (−Z)
  if (zellen.has(zelle(col - 1, row))) m |= 1 << 3; // W (−X)
  return m;
}

function rotMask(base: number[], r: number): number {
  let m = 0;
  for (const d of base) m |= 1 << ((d + r) % 4); // r×90° im Uhrzeigersinn (N→O→S→W)
  return m;
}

/** Tile-Art + Rotation (0..3 = r×90° im Uhrzeigersinn) für eine Nachbar-Maske. */
export function tileFuer(maske: number): { kind: RoadKind; rot: number } {
  const dirs = [0, 1, 2, 3].filter((d) => maske & (1 << d));
  const n = dirs.length;
  let kind: RoadKind;
  if (n >= 4) kind = 'kreuz';
  else if (n === 3) kind = 't';
  else if (n === 2) kind = (dirs[0]! + 2) % 4 === dirs[1]! ? 'gerade' : 'kurve';
  else if (n === 1) kind = 'ende';
  else kind = 'gerade'; // isolierte Zelle (selten): neutral
  const base = BASIS[kind];
  for (let r = 0; r < 4; r++) if (rotMask(base, r) === maske) return { kind, rot: r };
  return { kind, rot: 0 };
}
