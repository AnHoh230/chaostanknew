import { describe, it, expect } from 'vitest';
import { verbinde, type RoadOpt } from './moduleRoads';
import type { Platzierung } from './modulePlacement';
import type { ModulDef } from './muster';

function def(id: string): ModulDef {
  return { id, rolle: 'major', theme: 'depot', rows: ['....', '....', '....', '....'], kosten: 5, wand: 'none', anschluesse: [{ seite: 'N', art: 'road' }, { seite: 'S', art: 'road' }, { seite: 'O', art: 'road' }, { seite: 'W', art: 'road' }], drehbar: false, spiegelbar: false };
}
function platz(id: string, cx: number, cz: number): Platzierung {
  return { def: def(id), rot: 0, mirror: false, cx, cz, wCells: 4, hCells: 4 };
}

const OPT: RoadOpt = { extents: { halfX: 200, halfZ: 160 }, cellSize: 6, breiteZellen: 2 };
const MODULE = [platz('hub', 0, 0), platz('a', 120, 0), platz('b', -110, 60), platz('c', 80, -100)];

function einKomponente(n: number, kanten: [number, number][]): boolean {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  for (const [a, b] of kanten) parent[find(a)] = find(b);
  const wurzeln = new Set(Array.from({ length: n }, (_, i) => find(i)));
  return wurzeln.size === 1;
}

describe('verbinde', () => {
  it('ist deterministisch', () => {
    const x = verbinde(MODULE, OPT);
    const y = verbinde(MODULE, OPT);
    expect(x.kanten).toEqual(y.kanten);
    expect([...x.zellen].sort()).toEqual([...y.zellen].sort());
  });

  it('verbindet alle Module zu einem Spannbaum (alle erreichbar)', () => {
    const netz = verbinde(MODULE, OPT);
    expect(netz.kanten.length).toBe(MODULE.length - 1); // Baum
    expect(einKomponente(MODULE.length, netz.kanten)).toBe(true);
  });

  it('malt Straßenzellen (nicht leer ab 2 Modulen)', () => {
    const netz = verbinde(MODULE, OPT);
    expect(netz.zellen.size).toBeGreaterThan(0);
    expect(netz.segmente.length).toBe(MODULE.length - 1);
  });

  it('liefert für 0/1 Modul ein leeres Netz', () => {
    expect(verbinde([], OPT).zellen.size).toBe(0);
    expect(verbinde([platz('x', 0, 0)], OPT).kanten.length).toBe(0);
  });

  it('hält alle Straßenzellen im Raster', () => {
    const netz = verbinde(MODULE, OPT);
    const cols = Math.ceil((2 * OPT.extents.halfX) / OPT.cellSize);
    const rows = Math.ceil((2 * OPT.extents.halfZ) / OPT.cellSize);
    for (const key of netz.zellen) {
      const [c, r] = key.split(',').map(Number);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(cols);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(rows);
    }
  });
});
