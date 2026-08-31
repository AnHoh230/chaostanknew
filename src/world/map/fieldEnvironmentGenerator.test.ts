import { describe, expect, it } from 'vitest';
import { generateFieldEnvironment, type FieldEnvironmentContext } from './fieldEnvironmentGenerator';
import { FIELD_ENVIRONMENT_RULES } from './fieldEnvironmentGrammar';
import { createSeedStream } from './seedStreams';
import { cellCenter, createGridSpec } from './worldGrid';
import type { BiomeId, RegionInfo, SpatialReservation, WorldFields } from './worldTypes';

const GRID = createGridSpec(12, 6, 10);

function fixture(): FieldEnvironmentContext {
  const size = GRID.cols * GRID.rows;
  const openness = new Float32Array(size);
  const industrial = new Float32Array(size);
  const wetness = new Float32Array(size);
  const destruction = new Float32Array(size);
  const biomeByCell: BiomeId[] = [];
  const regionByCell: string[] = [];
  const regionCells = new Map<string, number[]>();

  for (let cell = 0; cell < size; cell++) {
    const col = cell % GRID.cols;
    const biome: BiomeId = col < 4 ? 'wasteland' : col < 8 ? 'mud' : 'crater';
    const regionId = `${biome}_0`;
    biomeByCell.push(biome);
    regionByCell.push(regionId);
    regionCells.set(regionId, [...(regionCells.get(regionId) ?? []), cell]);
    if (biome === 'wasteland') {
      openness[cell] = 0.9;
      wetness[cell] = 0.1;
      destruction[cell] = 0.25;
      industrial[cell] = 0.15;
    } else if (biome === 'mud') {
      openness[cell] = 0.35;
      wetness[cell] = 0.92;
      destruction[cell] = 0.2;
      industrial[cell] = 0.1;
    } else {
      openness[cell] = 0.45;
      wetness[cell] = 0.15;
      destruction[cell] = 0.94;
      industrial[cell] = 0.2;
    }
  }

  const fields: WorldFields = { grid: GRID, openness, industrial, wetness, destruction };
  const regions: RegionInfo[] = [...regionCells].map(([id, cells]) => ({
    id,
    biomeId: id.split('_')[0] as BiomeId,
    cells,
  }));
  const reservedCell = 2 * GRID.cols + 1;
  const reservations: SpatialReservation[] = [{
    id: 'reserved_wasteland_cell',
    type: 'spawn',
    grid: GRID,
    cells: [reservedCell],
    clearance: 8,
    allowedRoles: [],
  }];

  return {
    grid: GRID,
    fields,
    regions: { grid: GRID, biomeByCell, regionByCell, regions, seeds: [] },
    reservations,
    occupied: [],
  };
}

describe('fieldEnvironmentGenerator', () => {
  it('uebersetzt extreme Feldlagen in trockene, feuchte und felsige Umwelt-Occurrences', () => {
    const result = generateFieldEnvironment(fixture(), 1, createSeedStream(7, 'environment'));

    expect(new Set(result.map((feature) => feature.demandClass))).toEqual(new Set([
      'environment.dryBrush',
      'environment.wetBrush',
      'environment.rockOutcrop',
    ]));
    expect(result.every((feature) => feature.id.startsWith('environment_'))).toBe(true);
    expect(result.find((feature) => feature.demandClass === 'environment.dryBrush')?.biomeId).toBe('wasteland');
    expect(result.find((feature) => feature.demandClass === 'environment.wetBrush')?.biomeId).toBe('mud');
    expect(result.find((feature) => feature.demandClass === 'environment.rockOutcrop')?.biomeId).toBe('crater');
  });

  it('ist deterministisch und respektiert Grenzen, Mindestabstand und harte Reservations', () => {
    const context = fixture();
    const first = generateFieldEnvironment(context, 0.8, createSeedStream(91, 'environment'));
    const second = generateFieldEnvironment(context, 0.8, createSeedStream(91, 'environment'));

    expect(first).toEqual(second);
    for (const feature of first) {
      expect(Math.abs(feature.position.x) + feature.footprint.halfX + feature.clearance)
        .toBeLessThanOrEqual(GRID.extents.halfX);
      expect(Math.abs(feature.position.z) + feature.footprint.halfZ + feature.clearance)
        .toBeLessThanOrEqual(GRID.extents.halfZ);
      const reservation = context.reservations[0]!;
      const reservedCenter = cellCenter(reservation.grid, reservation.cells[0]!);
      expect(
        Math.abs(feature.position.x - reservedCenter.x) <= feature.footprint.halfX + reservation.grid.cellSize / 2 + feature.clearance + reservation.clearance
        && Math.abs(feature.position.z - reservedCenter.z) <= feature.footprint.halfZ + reservation.grid.cellSize / 2 + feature.clearance + reservation.clearance,
      ).toBe(false);
    }
    for (const rule of FIELD_ENVIRONMENT_RULES) {
      const matching = first.filter((feature) => feature.demandClass === rule.demandClass);
      for (let left = 0; left < matching.length; left++) {
        for (let right = left + 1; right < matching.length; right++) {
          expect(Math.hypot(
            matching[left]!.position.x - matching[right]!.position.x,
            matching[left]!.position.z - matching[right]!.position.z,
          )).toBeGreaterThanOrEqual(rule.minSpacing);
        }
      }
    }
  });
});
