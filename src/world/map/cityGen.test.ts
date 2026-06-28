import { describe, it, expect } from 'vitest';
import { generiereStadt, type StadtOpt } from './cityGen';
import type { ModulDef } from './muster';

// Modul mit allen Slot-Glyphen (n/*/X) + Props, zum Testen von Stempel + Caps.
function major(id: string): ModulDef {
  return {
    id, rolle: 'major', theme: 'depot',
    rows: ['#.B..#', '.o..n.', '..!*..', '#.X.o#'], // 6x4
    kosten: 5, wand: 'none',
    anschluesse: [{ seite: 'N', art: 'road' }, { seite: 'S', art: 'road' }],
    drehbar: true, spiegelbar: true,
  };
}

const OPT: StadtOpt = {
  extents: { halfX: 180, halfZ: 150 }, cellSize: 6,
  module: [major('a'), major('b'), major('c'), major('d')],
  caps: { maxNester: 1, maxPickups: 2, maxHazards: 3 },
  clearanceCells: 2, roadBreiteZellen: 2,
};

function zaehle(k: string, ents: { kind: string }[]): number {
  return ents.filter((e) => e.kind === k).length;
}

describe('generiereStadt — komplette Schleife', () => {
  it('ist deterministisch (gleicher Seed -> identische Karte)', () => {
    const a = generiereStadt(OPT, 2026);
    const b = generiereStadt(OPT, 2026);
    expect(a.entities).toEqual(b.entities);
    expect(a.roadZellen).toEqual(b.roadZellen);
    expect(a.blockRects).toEqual(b.blockRects);
  });

  it('produziert Entities und ein gültiges Layout', () => {
    const k = generiereStadt(OPT, 7);
    expect(k.valid).toBe(true);
    expect(k.entities.length).toBeGreaterThan(0);
    expect(k.blockRects.length).toBeGreaterThan(0);
    // Spannbaum: Wege = Module - 1
    expect(k.paths.length).toBe(k.blockRects.length - 1);
  });

  it('hält alle Entities innerhalb der Extents', () => {
    const k = generiereStadt(OPT, 55);
    for (const e of k.entities) {
      expect(Math.abs(e.pos.x)).toBeLessThanOrEqual(OPT.extents.halfX + 1e-6);
      expect(Math.abs(e.pos.z)).toBeLessThanOrEqual(OPT.extents.halfZ + 1e-6);
    }
  });

  it('deckelt Slots global (Nester/Pickups/Hazards trotz vieler Module)', () => {
    const k = generiereStadt(OPT, 123);
    expect(zaehle('dormantNest', k.entities)).toBeLessThanOrEqual(1); // maxNester
    expect(zaehle('collectible', k.entities)).toBeLessThanOrEqual(2); // maxPickups
    expect(zaehle('hazard', k.entities)).toBeLessThanOrEqual(3); // maxHazards
  });

  it('verschiedene Seeds -> verschiedene Layouts', () => {
    const a = generiereStadt(OPT, 1);
    const b = generiereStadt(OPT, 2);
    const posA = a.entities.map((e) => `${e.pos.x.toFixed(1)},${e.pos.z.toFixed(1)}`).join('|');
    const posB = b.entities.map((e) => `${e.pos.x.toFixed(1)},${e.pos.z.toFixed(1)}`).join('|');
    expect(posA).not.toBe(posB);
  });
});
