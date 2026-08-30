import { describe, expect, it } from 'vitest';
import { getAsset } from './assetKit';
import { assertAssetFits } from './grayboxResolver';
import { resolveGraybox } from './grayboxResolver';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('grayboxResolver', () => {
  it('projiziert die Welt ohne deren abstrakte Bytes zu veraendern', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 91);
    const before = JSON.stringify(world);
    const runtime = resolveGraybox(world);
    expect(runtime.seed).toBe(91);
    expect(runtime.entities).toHaveLength(world.features.length);
    expect(runtime.regionCells).toHaveLength(world.regions.grid.cols * world.regions.grid.rows);
    expect(JSON.stringify(world)).toBe(before);
    expect(runtime).not.toHaveProperty('zones');
    expect(runtime).not.toHaveProperty('rezeptId');
  });

  it('waehlt fuer jedes Feature ein Asset innerhalb seiner autoritativen Huelle', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 22);
    const runtime = resolveGraybox(world);
    for (const entity of runtime.entities) {
      const feature = world.features.find((entry) => entry.id === entity.params?.featureId)!;
      expect(() => assertAssetFits(feature, getAsset(entity.asset), entity.scale)).not.toThrow();
    }
  });
});
