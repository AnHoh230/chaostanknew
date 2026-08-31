import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { resolveAssetFamily, validateWorldStyleKit } from './worldStyleKit';

const ALL_PREVIEW_BIOMES = ['crater', 'industrial', 'mud', 'ruins', 'scrap', 'wasteland'];

describe('IRONWASTE_V1_PREVIEW_KIT', () => {
  it('besitzt eine gemeinsame Bildsprache fuer alle Generatorbiome und Strassen', () => {
    expect(IRONWASTE_V1_PREVIEW_KIT.globalStyle).toMatchObject({
      texelsPerWorldUnit: 16,
      materialFinish: 'matte-weathered',
    });
    expect(IRONWASTE_V1_PREVIEW_KIT.biomeKits.map((biome) => biome.biomeId).sort())
      .toEqual(ALL_PREVIEW_BIOMES);
    expect([...IRONWASTE_V1_PREVIEW_KIT.previewBiomes].sort())
      .toEqual(ALL_PREVIEW_BIOMES);
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
    ['crater', 'industrial'],
    ['crater', 'mud'],
    ['crater', 'ruins'],
    ['crater', 'scrap'],
    ['crater', 'wasteland'],
    ['industrial', 'mud'],
    ['industrial', 'ruins'],
    ['industrial', 'scrap'],
    ['industrial', 'wasteland'],
    ['mud', 'ruins'],
    ['mud', 'scrap'],
    ['mud', 'wasteland'],
    ['ruins', 'scrap'],
    ['ruins', 'wasteland'],
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

  it('verwendet fuer begrenzte Preview-Objekte echte Spritefamilien statt Geometrierezepten', () => {
    const boundedClasses = new Set([
      'industrial.linearBarrier',
      'industrial.coverCluster',
      'industrial.breakableEdge',
      'scrap.landmarkIsland',
      'scrap.wreckCluster',
      'scrap.scrapPile',
      'wasteland.landmarkIsland',
      'wasteland.destructibleBlob',
      'wasteland.coverCluster',
      'site.industrialYard',
      'site.scrapYard',
      'site.entrance',
    ]);
    const variants = IRONWASTE_V1_PREVIEW_KIT.families
      .filter((family) => family.fulfills.some((demandClass) => boundedClasses.has(demandClass)))
      .flatMap((family) => family.variants);

    expect(variants.length).toBeGreaterThan(0);
    for (const variant of variants) {
      expect(variant.geometryRecipe, variant.id).toBeUndefined();
      expect(variant.files, variant.id).toHaveLength(1);
      expect(variant.files[0], variant.id).toMatch(/\/sprite_[a-z_]+\.png$/);
    }
  });
});
