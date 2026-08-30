import { describe, expect, it } from 'vitest';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import { assertValidWorld, validateWorld, WorldGenerationError } from './worldValidator';

describe('worldValidator', () => {
  it('veraendert die validierte Welt nicht', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 7);
    const before = JSON.stringify(world);
    expect(validateWorld(world).hardFailures).toEqual([]);
    expect(JSON.stringify(world)).toBe(before);
  });

  it('wirft diagnostische Fehler statt einen anderen Seed zu wuerfeln', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const invalid = {
      ...world,
      intentGraph: { ...world.intentGraph, edges: [] },
    };
    try {
      assertValidWorld(invalid);
      throw new Error('expected-validation-error');
    } catch (error) {
      expect(error).toBeInstanceOf(WorldGenerationError);
      expect(error).toMatchObject({ seed: 17, stage: 'validation', invariant: 'all-sites-reachable' });
    }
  });

  it('erkennt blockierende Features in harten Fahrraum-Reservations', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 9);
    const corridorReservation = world.reservations.find((entry) => entry.type === 'corridor')!;
    const pointCell = corridorReservation.cells[Math.floor(corridorReservation.cells.length / 2)]!;
    const grid = corridorReservation.grid;
    const col = pointCell % grid.cols, row = Math.floor(pointCell / grid.cols);
    const invalid = {
      ...world,
      features: [...world.features, {
        id: 'illegal_blocker',
        demandClass: 'wasteland.coverCluster' as const,
        biomeId: 'wasteland' as const,
        regionId: world.regions.regionByCell[0]!,
        shape: 'point' as const,
        size: 'small' as const,
        traversal: 'blocking' as const,
        role: 'cover' as const,
        placementMode: 'single' as const,
        footprint: { halfX: 3, halfZ: 3 },
        clearance: 0,
        position: {
          x: -grid.extents.halfX + (col + 0.5) * grid.cellSize,
          z: -grid.extents.halfZ + (row + 0.5) * grid.cellSize,
        },
        rotation: 0,
      }],
    };
    expect(validateWorld(invalid).hardFailures.map((failure) => failure.invariant))
      .toContain('hard-reservations-unblocked');
  });
});
