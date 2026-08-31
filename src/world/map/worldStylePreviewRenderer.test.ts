import { NullEngine, Scene, StandardMaterial } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import manifestJson from './ironwasteCandidateManifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, type WorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import { createWorldStylePreview } from './worldStylePreviewRenderer';

const MANIFEST = manifestJson as AssetCandidateManifest;

function planFixture(): WorldAssetPlacementPlan {
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 17);
  return buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, MANIFEST, 2);
}

describe('worldStylePreviewRenderer', () => {
  it('materialisiert echte Familien und jede fehlende Familie als sichtbaren Diagnose-Marker', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plan = planFixture();

    const handle = createWorldStylePreview(scene, plan, IRONWASTE_V1_PREVIEW_KIT);

    expect(handle.meshCount).toBe(scene.meshes.length);
    expect(handle.meshCount).toBeGreaterThan(0);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_ground_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_road_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_sprite_'))).toBe(true);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_missing_'))).toBe(true);
    expect(scene.meshes.filter((mesh) => mesh.name.startsWith('style_missing_')))
      .toHaveLength(plan.placements.filter((placement) => placement.asset.status === 'missing').length);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('style_primitive_'))).toBe(false);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith('map_'))).toBe(false);
    handle.dispose();
    expect(scene.meshes).toHaveLength(0);
    engine.dispose();
  }, 30_000);

  it('weist sichtbare Script-Geometrie im Preview hart zurueck', () => {
    const plan = planFixture();
    const index = plan.placements.findIndex((placement) => (
      placement.kind === 'landscape' && placement.asset.status === 'resolved'
    ));
    const placement = plan.placements[index]!;
    if (placement.asset.status !== 'resolved') throw new Error('test-fixture-needs-resolved-landscape');
    const invalid: WorldAssetPlacementPlan = {
      ...plan,
      placements: plan.placements.map((entry, entryIndex) => entryIndex === index
        ? { ...placement, asset: { ...placement.asset, geometryRecipe: 'industrial-wall-and-hall-shell' } }
        : entry),
    };
    const engine = new NullEngine();
    const scene = new Scene(engine);

    expect(() => createWorldStylePreview(scene, invalid, IRONWASTE_V1_PREVIEW_KIT))
      .toThrow('style-preview-scripted-geometry-forbidden');
    engine.dispose();
  }, 30_000);

  it('rendert fertig beleuchtete Sprite-PNGs unverfaelscht und unbeleuchtet', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const handle = createWorldStylePreview(scene, planFixture(), IRONWASTE_V1_PREVIEW_KIT);
    const sprite = scene.meshes.find((mesh) => mesh.name.startsWith('style_sprite_'));

    expect(sprite).toBeDefined();
    expect(sprite!.material).toBeInstanceOf(StandardMaterial);
    const material = sprite!.material as StandardMaterial;
    expect(material.disableLighting).toBe(true);
    expect(material.emissiveColor.asArray()).toEqual([1, 1, 1]);

    handle.dispose();
    engine.dispose();
  }, 30_000);

  it('setzt den echten Spieler am Spawn als umschaltbare Massstabsreferenz ein', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const handle = createWorldStylePreview(scene, planFixture(), IRONWASTE_V1_PREVIEW_KIT, {
      player: {
        position: { x: 7, z: -11 },
        collisionRadius: 1.5,
        composition: { chassis: 'c_wide', wheels: 'w_tread', turret: 't_big', weapon: 'g_long' },
      },
    });

    expect(handle.playerReference).toBeDefined();
    expect(handle.playerReference!.root.position.x).toBe(7);
    expect(handle.playerReference!.root.position.z).toBe(-11);
    expect(handle.playerReference!.collisionDiameter).toBe(3);
    expect(handle.playerReference!.locator.isVisible).toBe(true);
    expect(handle.playerReference!.collisionRing.isVisible).toBe(false);

    handle.playerReference!.setScaleView(true);
    expect(handle.playerReference!.locator.isVisible).toBe(false);
    expect(handle.playerReference!.collisionRing.isVisible).toBe(true);

    handle.dispose();
    expect(scene.meshes).toHaveLength(0);
    engine.dispose();
  }, 30_000);

  it('zeigt fehlende Site-Assets als flachen Grundriss statt als Sichtblocker', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plan = planFixture();
    const missingSite = plan.placements.find((placement) => (
      placement.kind === 'site' && placement.asset.status === 'missing'
    ));
    expect(missingSite).toBeDefined();
    const handle = createWorldStylePreview(scene, plan, IRONWASTE_V1_PREVIEW_KIT);
    const mesh = scene.getMeshByName(`style_missing_${missingSite!.id}`);
    expect(mesh).toBeDefined();
    mesh!.computeWorldMatrix(true);
    const bounds = mesh!.getBoundingInfo().boundingBox;

    expect(bounds.maximumWorld.y - bounds.minimumWorld.y).toBeLessThanOrEqual(0.5);
    expect(mesh!.getTotalVertices()).toBeGreaterThan(100);

    handle.dispose();
    engine.dispose();
  }, 30_000);

});
