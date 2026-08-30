import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { createAssetCoverageAccumulator, measureSeedDemandCoverage } from './assetCoverage';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('worldAssetAudit', () => {
  it('akkumuliert Welten schrittweise mit demselben Ergebnis wie die Batch-Auswertung', () => {
    const worlds = [11, 12, 13].map((seed) => generiereWelt(DEFAULT_WORLD_OPTIONS, seed));
    const accumulator = createAssetCoverageAccumulator(REQUIRED_ASSET_CATALOG);
    worlds.forEach((world) => accumulator.addWorld(world));

    expect(accumulator.report()).toEqual(measureSeedDemandCoverage(worlds, REQUIRED_ASSET_CATALOG));
  }, 30_000);

  it('haelt den kompilierten Katalog waehrend der Akkumulation unveraendert', () => {
    const before = JSON.stringify(REQUIRED_ASSET_CATALOG);
    const accumulator = createAssetCoverageAccumulator(REQUIRED_ASSET_CATALOG);
    accumulator.addWorld(generiereWelt(DEFAULT_WORLD_OPTIONS, 21));
    accumulator.addWorld(generiereWelt(DEFAULT_WORLD_OPTIONS, 22));

    expect(accumulator.report().unknownDemandClasses).toEqual([]);
    expect(JSON.stringify(REQUIRED_ASSET_CATALOG)).toBe(before);
  }, 30_000);
});
