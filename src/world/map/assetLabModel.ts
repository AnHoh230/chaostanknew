import manifestJson from './ironwasteCandidateManifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import type { Vec2 } from './mapTypes';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, type WorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import type { Extents, Footprint, GenerierteWelt } from './worldTypes';

const IRONWASTE_MANIFEST = manifestJson as AssetCandidateManifest;

export interface AssetLabStats {
  totalPlacements: number;
  resolvedPlacements: number;
  missingPlacements: number;
  resolvedClasses: string[];
  missingByClass: Record<string, number>;
}

export interface IronwastePreviewModel {
  world: GenerierteWelt;
  plan: WorldAssetPlacementPlan;
  stats: AssetLabStats;
  spriteFamilies: SpriteFamilyPreview[];
  scale: AssetLabScale;
}

export interface SpriteFamilyPreview {
  demandClass: string;
  familyId: string;
  file: string;
  occurrenceCount: number;
}

export interface AssetLabScale {
  worldWidth: number;
  worldDepth: number;
  spawn: Vec2;
  siteDiameter: { min: number; max: number };
}

export type AssetLabCameraFocus =
  | { kind: 'world'; extents: Extents }
  | { kind: 'player'; position: Vec2 }
  | { kind: 'asset'; position: Vec2; footprint: Footprint };

export interface AssetLabCameraView {
  target: Vec2;
  radius: number;
  alpha: number;
  beta: number;
}

const GAME_CAMERA_HEIGHT = 25;
const GAME_CAMERA_BACK = 55;
const GAME_CAMERA_RADIUS = Math.hypot(GAME_CAMERA_HEIGHT, GAME_CAMERA_BACK);

export function computeAssetLabCameraView(focus: AssetLabCameraFocus): AssetLabCameraView {
  if (focus.kind === 'world') {
    return {
      target: { x: 0, z: 0 },
      radius: Math.hypot(focus.extents.halfX, focus.extents.halfZ) * 1.02,
      alpha: -Math.PI / 2,
      beta: 0.82,
    };
  }
  if (focus.kind === 'player') {
    return {
      target: { ...focus.position },
      radius: GAME_CAMERA_RADIUS,
      alpha: -Math.PI / 2,
      beta: Math.acos(GAME_CAMERA_HEIGHT / GAME_CAMERA_RADIUS),
    };
  }
  return {
    target: { ...focus.position },
    radius: Math.max(16, Math.hypot(focus.footprint.halfX, focus.footprint.halfZ) * 2.2),
    alpha: -Math.PI / 2,
    beta: 1.02,
  };
}

function integerSeed(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`asset-lab-invalid-${label}:${value}`);
  return Math.trunc(value);
}

export function parseAssetLabSeed(search: string, name: string, fallback: number): number {
  const raw = new URLSearchParams(search).get(name);
  if (raw === null || raw.trim() === '') return Math.trunc(fallback);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : Math.trunc(fallback);
}

export function buildIronwastePreview(worldSeed: number, visualSeed: number): IronwastePreviewModel {
  const normalizedWorldSeed = integerSeed(worldSeed, 'world-seed');
  const normalizedVisualSeed = integerSeed(visualSeed, 'visual-seed');
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, normalizedWorldSeed);
  const plan = buildWorldAssetPlacementPlan(
    world,
    IRONWASTE_V1_PREVIEW_KIT,
    IRONWASTE_MANIFEST,
    normalizedVisualSeed,
  );
  const missingByClass: Record<string, number> = {};
  for (const placement of plan.placements) {
    if (placement.asset.status !== 'missing') continue;
    missingByClass[placement.demandClass] = (missingByClass[placement.demandClass] ?? 0) + 1;
  }
  const resolvedPlacements = plan.placements.filter((placement) => placement.asset.status === 'resolved');
  const spriteFamilies = IRONWASTE_V1_PREVIEW_KIT.families.flatMap((family) => {
    const file = family.variants[0]?.files[0];
    if (!file || !/\/sprite_[a-z_]+\.png$/.test(file)) return [];
    const occurrenceCount = plan.placements.filter((placement) => (
      placement.asset.status === 'resolved' && placement.asset.familyId === family.id
    )).length;
    return family.fulfills.map((demandClass) => ({
      demandClass,
      familyId: family.id,
      file,
      occurrenceCount,
    }));
  }).sort((a, b) => a.demandClass.localeCompare(b.demandClass));
  const spawn = world.sites.find((site) => site.id === 'spawn') ?? world.sites[0];
  if (!spawn) throw new Error(`asset-lab-world-has-no-spawn:${world.seed}`);
  const siteDiameters = world.sites.map((site) => site.radius * 2);
  return {
    world,
    plan,
    spriteFamilies,
    scale: {
      worldWidth: world.extents.halfX * 2,
      worldDepth: world.extents.halfZ * 2,
      spawn: { ...spawn.center },
      siteDiameter: {
        min: Math.min(...siteDiameters),
        max: Math.max(...siteDiameters),
      },
    },
    stats: {
      totalPlacements: plan.placements.length,
      resolvedPlacements: resolvedPlacements.length,
      missingPlacements: plan.placements.length - resolvedPlacements.length,
      resolvedClasses: [...new Set(resolvedPlacements.map((placement) => placement.demandClass))]
        .sort((a, b) => a.localeCompare(b)),
      missingByClass: Object.fromEntries(
        Object.entries(missingByClass).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
  };
}
