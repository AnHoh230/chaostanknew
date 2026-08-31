import { describe, expect, it } from 'vitest';
import * as assetLabModule from './assetLabModel';
import { buildIronwastePreview } from './assetLabModel';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';

describe('AssetLab contract', () => {
  it('stellt ein einziges Modell aus Generator und Ironwaste-Kit bereit', () => {
    const exported = assetLabModule as unknown as Record<string, unknown>;
    expect(exported.buildIronwastePreview).toBeTypeOf('function');
  });
});

describe('AssetLab acceptance', () => {
  it('kompiliert zwanzig echte Generator-Seeds ohne Ersatzassets', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const model = buildIronwastePreview(seed, 1);
      expect(model.world.seed).toBe(seed);
      expect(model.plan.placements.length).toBeGreaterThan(0);
      expect(model.plan.placements.every((placement) => (
        placement.asset.familyId.startsWith(`${IRONWASTE_V1_PREVIEW_KIT.id}.`)
      ))).toBe(true);
      expect(model.stats.renderedPlacements).toBe(model.plan.placements.length);
      expect(model.stats.omittedDemands).toBe(model.plan.omitted.length);
    }
  }, 60_000);

  it('aendert mit dem Visual-Seed nur Varianten, nicht die Generatorwelt', () => {
    const first = buildIronwastePreview(17, 1);
    const second = buildIronwastePreview(17, 2);

    expect(first.world).toEqual(second.world);
    expect(first.plan.placements.map((placement) => placement.demandId))
      .toEqual(second.plan.placements.map((placement) => placement.demandId));
    expect(first.plan.placements.map((placement) => placement.asset.variantId))
      .not.toEqual(second.plan.placements.map((placement) => placement.asset.variantId));
  }, 20_000);

  it('liefert die echten begrenzten Assetfamilien fuer die sichtbare Lab-Galerie', () => {
    const model = buildIronwastePreview(19, 1);

    expect(model.spriteFamilies.map((family) => family.demandClass)).toEqual([
      'industrial.breakableEdge',
      'industrial.coverCluster',
      'industrial.linearBarrier',
      'scrap.landmarkIsland',
      'scrap.scrapPile',
      'scrap.wreckCluster',
      'site.entrance',
      'site.industrialYard',
      'site.scrapYard',
      'wasteland.coverCluster',
      'wasteland.destructibleBlob',
      'wasteland.landmarkIsland',
    ]);
    for (const family of model.spriteFamilies) {
      expect(family.file).toMatch(/^style-kits\/ironwaste-v1\/candidates\/sprite_[a-z_]+\.png$/);
    }
  }, 20_000);
});
