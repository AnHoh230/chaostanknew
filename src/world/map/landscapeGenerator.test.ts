import { describe, expect, it } from 'vitest';
import { createSeedStream } from './seedStreams';
import { featureFitsReservations, generateLandscape, type LandscapeContext } from './landscapeGenerator';
import { createGridSpec } from './worldGrid';
import type { RegionMap, SpatialReservation, WorldFields } from './worldTypes';

const FIELD_GRID = createGridSpec(20, 16, 10);
const PLACEMENT_GRID = createGridSpec(40, 32, 5);

function fixture(): LandscapeContext {
  const size = FIELD_GRID.cols * FIELD_GRID.rows;
  const cells = Array.from({ length: size }, (_, index) => index);
  const regions: RegionMap = {
    grid: FIELD_GRID,
    biomeByCell: Array(size).fill('industrial'),
    regionByCell: Array(size).fill('industrial_0'),
    regions: [{ id: 'industrial_0', biomeId: 'industrial', cells }],
    seeds: [{ id: 'industrial_0', biomeId: 'industrial', cell: Math.floor(size / 2) }],
  };
  const fields: WorldFields = {
    grid: FIELD_GRID,
    openness: Float32Array.from(cells, (cell) => (cell % FIELD_GRID.cols) / FIELD_GRID.cols),
    industrial: new Float32Array(size).fill(0.8),
    wetness: new Float32Array(size).fill(0.1),
    destruction: Float32Array.from(cells, (cell) => Math.floor(cell / FIELD_GRID.cols) / FIELD_GRID.rows),
  };
  const reservations: SpatialReservation[] = [{
    id: 'hard_center',
    type: 'spawn',
    grid: PLACEMENT_GRID,
    cells: [15 * PLACEMENT_GRID.cols + 19, 15 * PLACEMENT_GRID.cols + 20],
    clearance: 12,
    allowedRoles: [],
  }];
  return {
    grid: PLACEMENT_GRID,
    fields,
    regions,
    macro: { axisAngle: Math.PI / 6, axisStrength: 0.8, influences: [] },
    sites: [],
    corridors: [],
    reservations,
  };
}

describe('landscapeGenerator', () => {
  it('setzt keine blockierende Huelle in harte Reservations', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const context = fixture();
      const result = generateLandscape(context, createSeedStream(seed, 'landscape'));
      for (const feature of result.features.filter((entry) => entry.traversal === 'blocking')) {
        expect(featureFitsReservations(feature, context.reservations)).toBe(true);
      }
    }
  });

  it('erzeugt von gross nach klein und verwendet deterministische IDs', () => {
    const first = generateLandscape(fixture(), createSeedStream(55, 'landscape'));
    const second = generateLandscape(fixture(), createSeedStream(55, 'landscape'));
    expect(first.features.length).toBeGreaterThan(0);
    expect(first.features[0]!.size).toBe('large');
    expect(first.features.map((feature) => feature.size))
      .toEqual([...first.features.map((feature) => feature.size)].sort((a, b) => ['large', 'medium', 'small'].indexOf(a) - ['large', 'medium', 'small'].indexOf(b)));
    expect(first.features.map((feature) => feature.id)).toEqual(first.features.map((_, index) => `landscape_${index}`));
    expect(first).toEqual(second);
  });

  it('traegt die semantische Assetanforderung der Generatorgrammatik in jedes Feature', () => {
    const result = generateLandscape(fixture(), createSeedStream(55, 'landscape'));
    expect(result.features.length).toBeGreaterThan(0);
    expect(new Set(result.features.map((feature) => feature.demandClass)))
      .toEqual(new Set([
        'industrial.linearBarrier',
        'industrial.coverCluster',
        'industrial.breakableEdge',
      ]));
  });
});
