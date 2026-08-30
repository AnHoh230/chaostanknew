import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { resolveAssetFamily, validateWorldStyleKit } from './worldStyleKit';
import * as ironwasteModule from './ironwasteStyleKit';

describe('IRONWASTE_V1_PREVIEW_KIT', () => {
  it('stellt eine getrennte Geometrierezept-Fabrik bereit', () => {
    const exported = ironwasteModule as unknown as Record<string, unknown>;
    expect(exported.buildStyleGeometryRecipe).toBeTypeOf('function');
  });

  it('besitzt eine gemeinsame Bildsprache fuer Industrie, Schrott, Wasteland und Strassen', () => {
    expect(IRONWASTE_V1_PREVIEW_KIT.globalStyle).toMatchObject({
      texelsPerWorldUnit: 16,
      materialFinish: 'matte-weathered',
    });
    expect(IRONWASTE_V1_PREVIEW_KIT.biomeKits.map((biome) => biome.biomeId).sort())
      .toEqual(['industrial', 'scrap', 'wasteland']);
    expect([...IRONWASTE_V1_PREVIEW_KIT.previewBiomes].sort())
      .toEqual(['industrial', 'scrap', 'wasteland']);
    expect(IRONWASTE_V1_PREVIEW_KIT.families.flatMap((family) => family.fulfills))
      .toEqual(expect.arrayContaining([
        'ground.industrial',
        'ground.scrap',
        'ground.wasteland',
        'ground.transition',
        'corridor.surface',
        'industrial.linearBarrier',
        'scrap.wreckCluster',
        'wasteland.coverCluster',
        'wasteland.destructibleBlob',
        'wasteland.landmarkIsland',
      ]));
    expect(() => validateWorldStyleKit(IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG)).not.toThrow();
  });

  it.each([
    ['industrial', 'wasteland'],
    ['scrap', 'wasteland'],
  ] as const)('loest den genehmigten Biomuebergang %s zu %s ohne Ersatzfamilie auf', (fromBiome, toBiome) => {
    const choice = resolveAssetFamily(IRONWASTE_V1_PREVIEW_KIT, {
      id: `transition_${fromBiome}_${toBiome}`,
      demandClass: 'ground.transition',
      source: 'transition',
      biomes: [fromBiome, toBiome].sort(),
      footprint: { halfX: 0, halfZ: 0 },
      connectorProfiles: ['biome-boundary-v1'],
    }, 7);

    expect(choice.family.biomes).toEqual(expect.arrayContaining([fromBiome, toBiome]));
    expect(choice.variant.files[0]).toContain(`transition_${fromBiome}_${toBiome}`);
  });
});
