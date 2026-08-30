import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { measureSeedDemandCoverage } from './assetCoverage';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

describe('assetCoverage', () => {
  it('zaehlt beobachtete Klassen deterministisch ohne den Pflichtkatalog umzuschreiben', () => {
    const worlds = [1, 2, 3].map((seed) => generiereWelt(DEFAULT_WORLD_OPTIONS, seed));
    const before = JSON.stringify(REQUIRED_ASSET_CATALOG);
    const first = measureSeedDemandCoverage(worlds, REQUIRED_ASSET_CATALOG);
    const second = measureSeedDemandCoverage(worlds, REQUIRED_ASSET_CATALOG);

    expect(first).toEqual(second);
    expect(first.signature).toMatch(/^[0-9a-f]{8}$/);
    expect(first.counts['corridor.surface']).toBeGreaterThan(0);
    expect(first.counts['ground.transition']).toBeGreaterThan(0);
    expect(first.unknownDemandClasses).toEqual([]);
    expect(JSON.stringify(REQUIRED_ASSET_CATALOG)).toBe(before);
  }, 30_000);

  it('meldet unbekannte Vorkommen statt sie als neue Katalogfamilie aufzunehmen', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 4);
    world.features[0]!.demandClass = 'future.unknown' as typeof world.features[number]['demandClass'];

    const report = measureSeedDemandCoverage([world], REQUIRED_ASSET_CATALOG);

    expect(report.unknownDemandClasses).toEqual(['future.unknown']);
    expect(REQUIRED_ASSET_CATALOG.families.some((family) => String(family.demandClass) === 'future.unknown')).toBe(false);
  }, 20_000);
});
