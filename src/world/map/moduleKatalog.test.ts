import { describe, it, expect } from 'vitest';
import { MODUL_KATALOG } from './moduleKatalog';
import { parseMuster, footprint } from './muster';
import { generiereStadt } from './cityGen';
import { getAsset } from './assetKit';

describe('MODUL_KATALOG', () => {
  it('jedes Modul ist ein rechteckiges Raster (sonst Boot-Crash)', () => {
    for (const m of MODUL_KATALOG) {
      expect(() => parseMuster(m.rows), m.id).not.toThrow();
      const fp = footprint(m, 0);
      expect(fp.h, m.id).toBe(m.rows.length);
      expect(fp.w, m.id).toBe(m.rows[0]!.length);
    }
  });

  it('hat einen Hub (Index 0) und mehrere Majors', () => {
    expect(MODUL_KATALOG[0]!.rolle).toBe('connector');
    expect(MODUL_KATALOG.filter((m) => m.rolle === 'major').length).toBeGreaterThanOrEqual(4);
  });

  it('jedes erzeugte Asset existiert im Kit (sonst Boot-Crash via getAsset)', () => {
    for (const seed of [1, 2, 3, 7, 42, 1337]) {
      const k = generiereStadt(
        { extents: { halfX: 400, halfZ: 320 }, cellSize: 6, module: MODUL_KATALOG, spawnFreiRadius: 34 },
        seed,
      );
      expect(k.entities.length).toBeGreaterThan(0);
      for (const e of k.entities) {
        expect(() => getAsset(e.asset), e.asset).not.toThrow();
      }
    }
  });
});
