import { describe, expect, it } from 'vitest';
import { getAsset } from './assetKit';
import { assertAssetFits, resolveGraybox } from './grayboxResolver';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('Hybridgenerator Seed-Audit', () => {
  it('haelt 500 Seeds valide und strukturell verschieden', () => {
    const signatures = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) {
      const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
      expect(world.debug.validation.hardFailures, `Seed ${seed}`).toEqual([]);
      expect(world.sites.length, `Seed ${seed}`).toBeGreaterThanOrEqual(7);
      expect(world.corridors.length, `Seed ${seed}`).toBe(world.intentGraph.edges.length);
      signatures.add(world.debug.quality.signature);
    }
    expect(signatures.size).toBeGreaterThan(400);
  }, 1_200_000);

  it('loest die ersten zwanzig Seeds ohne Huelleverletzung in Graybox-Assets auf', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
      const runtime = resolveGraybox(world);
      expect(runtime.regionCells).toHaveLength(DEFAULT_WORLD_OPTIONS.fieldGrid.cols * DEFAULT_WORLD_OPTIONS.fieldGrid.rows);
      for (const entity of runtime.entities) {
        const feature = world.features.find((entry) => entry.id === entity.params?.featureId)!;
        expect(() => assertAssetFits(feature, getAsset(entity.asset), entity.scale), `Seed ${seed}, ${entity.id}`).not.toThrow();
      }
    }
  }, 60_000);
});
