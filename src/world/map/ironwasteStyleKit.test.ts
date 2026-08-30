import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { validateWorldStyleKit } from './worldStyleKit';
import * as ironwasteModule from './ironwasteStyleKit';

describe('IRONWASTE_V1_PREVIEW_KIT', () => {
  it('stellt eine getrennte Geometrierezept-Fabrik bereit', () => {
    const exported = ironwasteModule as unknown as Record<string, unknown>;
    expect(exported.buildStyleGeometryRecipe).toBeTypeOf('function');
  });

  it('besitzt eine gemeinsame Bildsprache fuer Industrie, Schrott und Strassen', () => {
    expect(IRONWASTE_V1_PREVIEW_KIT.globalStyle).toMatchObject({
      texelsPerWorldUnit: 16,
      materialFinish: 'matte-weathered',
    });
    expect(IRONWASTE_V1_PREVIEW_KIT.biomeKits.map((biome) => biome.biomeId).sort())
      .toEqual(['industrial', 'scrap']);
    expect(IRONWASTE_V1_PREVIEW_KIT.families.flatMap((family) => family.fulfills))
      .toEqual(expect.arrayContaining([
        'ground.industrial',
        'ground.scrap',
        'ground.transition',
        'corridor.surface',
        'industrial.linearBarrier',
        'scrap.wreckCluster',
      ]));
    expect(() => validateWorldStyleKit(IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG)).not.toThrow();
  });
});
