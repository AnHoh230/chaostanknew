import manifestJson from '../../../public/style-kits/ironwaste-v1/candidates/candidate-manifest.json';
import type { AssetCandidateManifest } from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';
import { buildWorldAssetPlacementPlan, type WorldAssetPlacementPlan } from './worldAssetPlacement';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from './worldGenerator';
import type { GenerierteWelt } from './worldTypes';

const IRONWASTE_MANIFEST = manifestJson as AssetCandidateManifest;

export interface AssetLabStats {
  renderedPlacements: number;
  omittedDemands: number;
  renderedClasses: string[];
  omittedByClass: Record<string, number>;
}

export interface IronwastePreviewModel {
  world: GenerierteWelt;
  plan: WorldAssetPlacementPlan;
  stats: AssetLabStats;
}

function integerSeed(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`asset-lab-invalid-${label}:${value}`);
  return Math.trunc(value);
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
  const omittedByClass: Record<string, number> = {};
  for (const omitted of plan.omitted) {
    omittedByClass[omitted.demandClass] = (omittedByClass[omitted.demandClass] ?? 0) + 1;
  }
  return {
    world,
    plan,
    stats: {
      renderedPlacements: plan.placements.length,
      omittedDemands: plan.omitted.length,
      renderedClasses: [...new Set(plan.placements.map((placement) => placement.demandClass))]
        .sort((a, b) => a.localeCompare(b)),
      omittedByClass: Object.fromEntries(
        Object.entries(omittedByClass).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
  };
}
