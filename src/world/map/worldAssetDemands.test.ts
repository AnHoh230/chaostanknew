import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import { deriveWorldAssetDemands } from './worldAssetDemands';

describe('worldAssetDemands', () => {
  it('leitet konkrete Vorkommen aus der fertigen Welt ab ohne sie zu veraendern', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 42);
    const before = JSON.stringify(world);
    const demands = deriveWorldAssetDemands(world);
    const activeGround = [...new Set(world.regions.biomeByCell)]
      .map((biome) => `ground.${biome}`)
      .sort();

    expect(demands.filter((entry) => entry.source === 'landscape')).toHaveLength(world.features.length);
    expect(demands.filter((entry) => entry.source === 'ground').map((entry) => entry.demandClass).sort())
      .toEqual(activeGround);
    expect(demands.filter((entry) => entry.demandClass === 'corridor.surface'))
      .toHaveLength(world.corridors.length);
    expect(demands.filter((entry) => entry.demandClass === 'corridor.edge'))
      .toHaveLength(world.corridors.length);
    expect(JSON.stringify(world)).toBe(before);
  }, 20_000);

  it('emittiert nur Klassen aus dem mathematisch kompilierten Katalog', () => {
    const known = new Set<string>(REQUIRED_ASSET_CATALOG.families.map((family) => family.demandClass));
    for (let seed = 1; seed <= 5; seed++) {
      const demands = deriveWorldAssetDemands(generiereWelt(DEFAULT_WORLD_OPTIONS, seed));
      expect([...new Set(demands.map((entry) => entry.demandClass).filter((entry) => !known.has(entry)))])
        .toEqual([]);
    }
  }, 30_000);
});
