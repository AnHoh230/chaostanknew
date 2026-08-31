import { describe, expect, it } from 'vitest';
import * as assetLabModule from './assetLabModel';
import { buildIronwastePreview } from './assetLabModel';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { deriveWorldAssetDemandsFromTargets } from './worldAssetPlacement';

describe('AssetLab contract', () => {
  it('stellt ein einziges Modell aus Generator und Ironwaste-Kit bereit', () => {
    const exported = assetLabModule as unknown as Record<string, unknown>;
    expect(exported.buildIronwastePreview).toBeTypeOf('function');
  });

  it('liefert Kameraansichten fuer Gesamtwelt, Spieler und eine Asset-Occurrence', () => {
    const exported = assetLabModule as unknown as Record<string, unknown>;
    expect(exported.computeAssetLabCameraView).toBeTypeOf('function');
    if (typeof exported.computeAssetLabCameraView !== 'function') return;
    const compute = exported.computeAssetLabCameraView as (focus: unknown) => {
      target: { x: number; z: number };
      radius: number;
      beta: number;
    };
    const world = compute({ kind: 'world', extents: { halfX: 400, halfZ: 320 } });
    const player = compute({ kind: 'player', position: { x: 7, z: -11 } });
    const asset = compute({
      kind: 'asset',
      position: { x: 35, z: 22 },
      footprint: { halfX: 20, halfZ: 20 },
    });
    const smallAsset = compute({
      kind: 'asset',
      position: { x: -4, z: 9 },
      footprint: { halfX: 3, halfZ: 3 },
    });

    expect(world.target).toEqual({ x: 0, z: 0 });
    expect(world.radius).toBeGreaterThan(500);
    expect(player.target).toEqual({ x: 7, z: -11 });
    expect(player.radius).toBeCloseTo(Math.hypot(25, 55), 6);
    expect(player.beta).toBeCloseTo(Math.acos(25 / Math.hypot(25, 55)), 6);
    expect(asset.target).toEqual({ x: 35, z: 22 });
    expect(asset.radius).toBeGreaterThan(40);
    expect(asset.radius).toBeLessThan(world.radius);
    expect(smallAsset.radius).toBeGreaterThanOrEqual(14);
    expect(smallAsset.radius).toBeLessThanOrEqual(20);
  });

  it('verwendet ohne oder mit ungueltigem URL-Parameter wirklich den Startwelt-Fallback', () => {
    const exported = assetLabModule as unknown as Record<string, unknown>;
    expect(exported.parseAssetLabSeed).toBeTypeOf('function');
    if (typeof exported.parseAssetLabSeed !== 'function') return;
    const parse = exported.parseAssetLabSeed as (search: string, name: string, fallback: number) => number;

    expect(parse('', 'seed', 1337)).toBe(1337);
    expect(parse('?visualSeed=2', 'seed', 1337)).toBe(1337);
    expect(parse('?seed=19', 'seed', 1337)).toBe(19);
    expect(parse('?seed=kaputt', 'seed', 1337)).toBe(1337);
  });
});

describe('AssetLab acceptance', () => {
  it('zeigt fuer zwanzig echte Generator-Seeds jede Anforderung als Asset oder Missing-Marker', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const model = buildIronwastePreview(seed, 1);
      const demands = deriveWorldAssetDemandsFromTargets(model.world);
      expect(model.world.seed).toBe(seed);
      expect(model.plan.placements).toHaveLength(demands.length);
      expect(model.plan.placements.every((placement) => {
        if (placement.asset.status === 'missing') return !('files' in placement.asset);
        return placement.asset.familyId.startsWith(`${IRONWASTE_V1_PREVIEW_KIT.id}.`);
      })).toBe(true);
      expect(model.stats.totalPlacements).toBe(model.plan.placements.length);
      expect(model.stats.resolvedPlacements + model.stats.missingPlacements)
        .toBe(model.stats.totalPlacements);
      expect(model.stats.missingPlacements).toBeGreaterThan(0);
    }
  }, 60_000);

  it('aendert mit dem Visual-Seed nur Varianten, nicht die Generatorwelt', () => {
    const first = buildIronwastePreview(17, 1);
    const second = buildIronwastePreview(17, 2);

    expect(first.world).toEqual(second.world);
    expect(first.plan.placements.map((placement) => placement.demandId))
      .toEqual(second.plan.placements.map((placement) => placement.demandId));
    const variants = (model: ReturnType<typeof buildIronwastePreview>): string[] => (
      model.plan.placements.map((placement) => placement.asset.status === 'resolved'
        ? placement.asset.variantId
        : `missing:${placement.demandClass}`)
    );
    expect(variants(first)).not.toEqual(variants(second));
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
      expect(family).toHaveProperty('occurrenceCount');
    }
  }, 20_000);

  it('liefert den echten Welt-, Spawn- und Site-Massstab des Generator-Seeds', () => {
    const model = buildIronwastePreview(19, 1) as ReturnType<typeof buildIronwastePreview> & {
      scale?: {
        worldWidth: number;
        worldDepth: number;
        spawn: { x: number; z: number };
        siteDiameter: { min: number; max: number };
      };
    };

    expect(model.scale).toEqual({
      worldWidth: 800,
      worldDepth: 640,
      spawn: { x: 0, z: 0 },
      siteDiameter: {
        min: expect.any(Number),
        max: expect.any(Number),
      },
    });
    expect(model.scale!.siteDiameter.min).toBeGreaterThanOrEqual(36);
    expect(model.scale!.siteDiameter.max).toBeLessThanOrEqual(52);
  }, 20_000);
});
