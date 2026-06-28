import { describe, it, expect } from 'vitest';
import { platziere, weltAABB, anschlussWeltpunkt, type Platzierung, type PlatzierOpt } from './modulePlacement';
import type { ModulDef } from './muster';

function modul(id: string, w: number, h: number, drehbar = false): ModulDef {
  const rows = Array.from({ length: h }, () => '.'.repeat(w));
  return { id, rolle: 'major', theme: 'depot', rows, kosten: 5, wand: 'none', anschluesse: [{ seite: 'S', art: 'road' }], drehbar, spiegelbar: false };
}

const OPT: PlatzierOpt = { extents: { halfX: 200, halfZ: 160 }, cellSize: 6, clearanceCells: 2, maxTries: 80 };
const SECHS = [modul('a', 4, 4), modul('b', 5, 4, true), modul('c', 4, 6), modul('d', 6, 4), modul('e', 4, 4, true), modul('f', 5, 5)];

function paddedAABB(p: Platzierung): ReturnType<typeof weltAABB> {
  return weltAABB(p, OPT.cellSize, ((OPT.clearanceCells ?? 2) * OPT.cellSize) / 2);
}
function overlap(a: ReturnType<typeof weltAABB>, b: ReturnType<typeof weltAABB>): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

describe('platziere', () => {
  it('ist deterministisch (gleicher Seed -> identische Platzierung)', () => {
    const x = platziere(SECHS, 4242, OPT);
    const y = platziere(SECHS, 4242, OPT);
    expect(x).toEqual(y);
    expect(x.length).toBe(6);
  });

  it('platziert überlappungsfrei (inkl. Clearance)', () => {
    const p = platziere(SECHS, 99, OPT);
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        expect(overlap(paddedAABB(p[i]!), paddedAABB(p[j]!))).toBe(false);
      }
    }
  });

  it('hält jedes Modul vollständig in den Extents', () => {
    const p = platziere(SECHS, 7, OPT);
    for (const m of p) {
      const b = weltAABB(m, OPT.cellSize, 0);
      expect(b.minX).toBeGreaterThanOrEqual(-OPT.extents.halfX - 1e-6);
      expect(b.maxX).toBeLessThanOrEqual(OPT.extents.halfX + 1e-6);
      expect(b.minZ).toBeGreaterThanOrEqual(-OPT.extents.halfZ - 1e-6);
      expect(b.maxZ).toBeLessThanOrEqual(OPT.extents.halfZ + 1e-6);
    }
  });

  it('lässt ein zu großes Modul aus, statt es zu klippen', () => {
    const riesig = modul('riesig', 100, 100);
    expect(platziere([riesig], 1, OPT)).toEqual([]);
  });

  it('anschlussWeltpunkt liegt auf der jeweiligen Kantenmitte', () => {
    const p: Platzierung = { def: modul('x', 4, 4), rot: 0, mirror: false, cx: 10, cz: 20, wCells: 4, hCells: 4 };
    expect(anschlussWeltpunkt(p, 'N', 6)).toEqual({ x: 10, z: 32 });
    expect(anschlussWeltpunkt(p, 'O', 6)).toEqual({ x: 22, z: 20 });
    expect(anschlussWeltpunkt(p, 'S', 6)).toEqual({ x: 10, z: 8 });
    expect(anschlussWeltpunkt(p, 'W', 6)).toEqual({ x: -2, z: 20 });
  });
});
