import { describe, expect, it } from 'vitest';
import manifestJson from '../../../public/style-kits/ironwaste-v1/candidates/candidate-manifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';

const MANIFEST = manifestJson as AssetCandidateManifest;

describe('worldAssetPlacement', () => {
  it('kompiliert fuer denselben Visual-Seed denselben Plan ohne die Welt zu veraendern', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const before = JSON.stringify(world);

    const first = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 91);
    const second = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 91);

    expect(first).toEqual(second);
    expect(JSON.stringify(world)).toBe(before);
    expect(first.placements.length).toBeGreaterThan(0);
    expect(first.placements.every((placement) => placement.asset.familyId.startsWith(`${first.kitId}.`)))
      .toBe(true);
  }, 20_000);

  it('laesst im Preview nur explizit freigegebene Klassen und Biome durch', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 3);
    const supportedBiomes = new Set(IRONWASTE_V1_PREVIEW_KIT.previewBiomes);

    expect(plan.placements.every((placement) => (
      IRONWASTE_V1_PREVIEW_KIT.previewScope.includes(placement.demandClass)
      && placement.biomes.every((biome) => supportedBiomes.has(biome))
    ))).toBe(true);
    expect(plan.omitted.length).toBeGreaterThan(0);
    expect(plan.omitted.every((entry) => entry.reason === 'outside-preview-scope')).toBe(true);
    expect(plan.placements.some((entry) => entry.demandClass === 'ground.wasteland')).toBe(true);
    expect(plan.placements.some((entry) => entry.demandClass === 'wasteland.landmarkIsland')).toBe(true);
    expect(plan.placements.some((entry) => (
      entry.kind === 'transition' && entry.biomes.includes('wasteland')
    ))).toBe(true);
    expect(plan.omitted.some((entry) => entry.demandClass.startsWith('wasteland.'))).toBe(false);
  }, 20_000);

  it('platziert jede unterstuetzte Site-Einfahrt am zugehoerigen Korridorende', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 4);
    const entrances = plan.placements.filter((placement) => placement.kind === 'entrance');
    const supported = new Set(IRONWASTE_V1_PREVIEW_KIT.previewBiomes);
    const expected = world.corridors.flatMap((corridor) => [corridor.fromSiteId, corridor.toSiteId])
      .filter((siteId) => supported.has(world.sites.find((site) => site.id === siteId)!.biomeId));

    expect(entrances).toHaveLength(expected.length);
    for (const entrance of entrances) {
      const corridor = world.corridors.find((entry) => entry.id === entrance.corridorId)!;
      const endpoints = [corridor.centerline[0]!, corridor.centerline.at(-1)!];
      expect(endpoints).toContainEqual(entrance.position);
      expect(Number.isFinite(entrance.rotation)).toBe(true);
    }
  }, 20_000);
});
