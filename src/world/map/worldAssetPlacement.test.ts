import { describe, expect, it } from 'vitest';
import manifestJson from './ironwasteCandidateManifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, deriveWorldAssetDemandsFromTargets } from './worldAssetPlacement';
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
    expect(first.placements.every((placement) => (
      placement.asset.status === 'missing'
      || placement.asset.familyId.startsWith(`${first.kitId}.`)
    ))).toBe(true);
  }, 20_000);

  it('uebersetzt jede Generator-Anforderung genau einmal in Asset oder sichtbaren Missing-Marker', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 3);
    const demands = deriveWorldAssetDemandsFromTargets(world);
    const supportedBiomes = new Set(IRONWASTE_V1_PREVIEW_KIT.previewBiomes);

    expect(plan.placements).toHaveLength(demands.length);
    expect(new Set(plan.placements.map((placement) => placement.demandId)).size).toBe(demands.length);
    expect(plan.placements.map((placement) => placement.demandId).sort())
      .toEqual(demands.map((demand) => demand.id).sort());
    expect('omitted' in plan).toBe(false);
    const resolved = plan.placements.filter((placement) => placement.asset.status === 'resolved');
    const missing = plan.placements.filter((placement) => placement.asset.status === 'missing');
    expect(resolved.every((placement) => (
      IRONWASTE_V1_PREVIEW_KIT.previewScope.includes(placement.demandClass)
      && placement.biomes.every((biome) => supportedBiomes.has(biome))
    ))).toBe(true);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((placement) => (
      placement.asset.status === 'missing'
      && placement.asset.reason === 'outside-preview-scope'
    ))).toBe(true);
    expect(missing.every((placement) => !('files' in placement.asset))).toBe(true);
    expect(plan.placements.some((entry) => entry.demandClass === 'ground.wasteland')).toBe(true);
    expect(plan.placements.some((entry) => entry.demandClass === 'wasteland.landmarkIsland')).toBe(true);
    expect(plan.placements.some((entry) => (
      entry.kind === 'transition' && entry.biomes.includes('wasteland')
    ))).toBe(true);
    expect(missing.some((entry) => entry.demandClass.startsWith('wasteland.'))).toBe(false);
  }, 20_000);

  it('platziert jede unterstuetzte Site-Einfahrt am zugehoerigen Korridorende', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 4);
    const entrances = plan.placements.filter((placement) => placement.kind === 'entrance');
    const supported = new Set(IRONWASTE_V1_PREVIEW_KIT.previewBiomes);
    const expected = world.corridors.flatMap((corridor) => [corridor.fromSiteId, corridor.toSiteId])
      .filter((siteId) => supported.has(world.sites.find((site) => site.id === siteId)!.biomeId));

    expect(entrances).toHaveLength(world.corridors.length * 2);
    expect(entrances.filter((entrance) => entrance.asset.status === 'resolved')).toHaveLength(expected.length);
    for (const entrance of entrances) {
      const corridor = world.corridors.find((entry) => entry.id === entrance.corridorId)!;
      const endpoints = [corridor.centerline[0]!, corridor.centerline.at(-1)!];
      expect(endpoints).toContainEqual(entrance.position);
      expect(Number.isFinite(entrance.rotation)).toBe(true);
    }
  }, 20_000);

  it('laesst fuer kein Generatorbiom schwarze Boden- oder Uebergangsluecken', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
      const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 5);
      const generatedBiomes = [...new Set(world.regions.biomeByCell)].sort();
      const renderedGrounds = plan.placements
        .filter((placement) => placement.kind === 'ground')
        .map((placement) => placement.biomeId)
        .sort();

      expect(renderedGrounds, `Seed ${seed}`).toEqual(generatedBiomes);
      expect(plan.placements
        .filter((entry) => entry.demandClass.startsWith('ground.'))
        .every((entry) => entry.asset.status === 'resolved'), `Seed ${seed}`).toBe(true);
    }
  }, 60_000);

  it('reicht begrenzte Objekte als Spriteplatzierungen ohne sichtbare Graybox-Rezepte weiter', () => {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
    const plan = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 6);
    const bounded = plan.placements.filter((placement) => (
      placement.kind === 'landscape' || placement.kind === 'site' || placement.kind === 'entrance'
    ));
    const resolvedBounded = bounded.filter((placement) => placement.asset.status === 'resolved');

    expect(resolvedBounded.length).toBeGreaterThan(0);
    for (const placement of resolvedBounded) {
      if (placement.asset.status !== 'resolved') throw new Error('expected-resolved-bounded-placement');
      expect(placement.asset.geometryRecipe, placement.id).toBeUndefined();
      expect(placement.asset.files[0], placement.id).toMatch(/\/sprite_[a-z_]+\.png$/);
    }
  }, 20_000);
});
