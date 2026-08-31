import { generateFieldEnvironment } from './fieldEnvironmentGenerator';
import { generateLandscape } from './landscapeGenerator';
import { generateMacroStructure } from './macroStructure';
import { DEFAULT_PATH_ROUTING, routeCorridors } from './pathRouter';
import { buildRealizedTraversalGraph } from './realizedTraversalGraph';
import { generateRegions, selectActiveBiomes } from './regionGenerator';
import { createSeedStream } from './seedStreams';
import { generateSites } from './siteGenerator';
import { resolveSiteTopology } from './siteRoleResolver';
import { generateSpatialReservations } from './spatialReservations';
import { buildTerrainCostGraph, buildTraversalGraph, DEFAULT_ROUTING } from './traversalGraph';
import { FIELD_GRID, TRAVERSAL_GRID } from './worldGrid';
import { generateWorldDNA } from './worldDNA';
import { derivePotentials, generateWorldFields } from './worldFields';
import {
  assertValidWorld,
  buildWorldDebugData,
  validateWorld,
  WorldGenerationError,
} from './worldValidator';
import type { GenerierteWelt, WorldGenerationOptions } from './worldTypes';

export const DEFAULT_WORLD_OPTIONS: WorldGenerationOptions = {
  extents: { halfX: 400, halfZ: 320 },
  fieldGrid: FIELD_GRID,
  traversalGrid: TRAVERSAL_GRID,
  corridorWidth: 12,
  corridorClearance: 3,
  maxSiteDegree: 4,
};

function runStage<T>(seed: number, stage: string, action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof WorldGenerationError) throw error;
    throw new WorldGenerationError(seed, stage, 'stage-completed', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

function assertOptions(options: WorldGenerationOptions): void {
  if (
    options.fieldGrid.extents.halfX !== options.extents.halfX
    || options.fieldGrid.extents.halfZ !== options.extents.halfZ
    || options.traversalGrid.extents.halfX !== options.extents.halfX
    || options.traversalGrid.extents.halfZ !== options.extents.halfZ
  ) throw new Error('world-grid-extents-mismatch');
  if (options.maxSiteDegree !== 4) throw new Error('max-site-degree-must-be-four');
}

export function generiereWelt(options: WorldGenerationOptions, seed: number): GenerierteWelt {
  runStage(seed, 'options', () => assertOptions(options));
  const dna = runStage(seed, 'worldDNA', () => generateWorldDNA(seed, options.dnaOverride));
  const macro = runStage(seed, 'macroStructure', () => generateMacroStructure(
    dna,
    options.fieldGrid,
    createSeedStream(seed, 'macro'),
  ));
  const fields = runStage(seed, 'worldFields', () => generateWorldFields(
    dna,
    macro,
    options.fieldGrid,
    createSeedStream(seed, 'fields'),
  ));
  const potentials = runStage(seed, 'derivedPotentials', () => derivePotentials(fields));
  const activeBiomes = runStage(seed, 'activeBiomeSet', () => selectActiveBiomes(potentials));
  const regions = runStage(seed, 'regionGenerator', () => generateRegions(
    options.fieldGrid,
    fields,
    potentials,
    activeBiomes,
    dna,
    createSeedStream(seed, 'regions'),
  ));
  const sites = runStage(seed, 'siteGenerator', () => generateSites(
    options.fieldGrid,
    fields,
    regions,
    dna,
    createSeedStream(seed, 'sites'),
  ));
  const terrainCosts = runStage(seed, 'terrainCostGraph', () => buildTerrainCostGraph(
    sites,
    options.fieldGrid,
    fields,
    regions,
    DEFAULT_ROUTING,
  ));
  const intentGraph = runStage(seed, 'traversalGraph', () => buildTraversalGraph(
    terrainCosts,
    dna.roadDensity,
    options.maxSiteDegree,
  ));
  const corridors = runStage(seed, 'pathRouter', () => routeCorridors(
    intentGraph,
    sites,
    options.traversalGrid,
    fields,
    regions,
    {
      ...DEFAULT_PATH_ROUTING,
      corridorWidth: options.corridorWidth,
      corridorClearance: options.corridorClearance,
    },
  ));
  const realizedGraph = runStage(seed, 'realizedTraversalGraph', () => buildRealizedTraversalGraph(
    sites,
    corridors,
    options.traversalGrid,
  ));
  const siteTopology = runStage(seed, 'siteRoleResolver', () => resolveSiteTopology(
    realizedGraph,
    sites[0]?.id ?? 'spawn',
  ));
  const baseReservations = runStage(seed, 'spatialReservations', () => generateSpatialReservations(
    sites,
    corridors,
    realizedGraph,
    options.traversalGrid,
  ));
  const landscape = runStage(seed, 'landscapeGenerator', () => generateLandscape({
    grid: options.traversalGrid,
    fields,
    regions,
    macro,
    sites,
    corridors,
    reservations: baseReservations,
  }, createSeedStream(seed, 'landscape')));
  const environment = runStage(seed, 'fieldEnvironmentGenerator', () => generateFieldEnvironment({
    grid: options.traversalGrid,
    fields,
    regions,
    reservations: [...baseReservations, ...landscape.negativeSpace],
    occupied: landscape.features,
  }, dna.structuralDensity, createSeedStream(seed, 'environment')));

  const world: GenerierteWelt = {
    seed,
    extents: { ...options.extents },
    dna,
    macro,
    fields,
    potentials,
    regions,
    sites,
    intentGraph,
    corridors,
    realizedGraph,
    siteTopology,
    reservations: [...baseReservations, ...landscape.negativeSpace],
    features: [...landscape.features, ...environment],
    debug: {
      validation: { hardFailures: [] },
      quality: { signature: '', composedRatio: 0, maxUncomposedArea: 0, longestCorridorWithoutNode: 0 },
      fieldStats: {},
      selectedCandidates: {},
    },
  };
  const validation = runStage(seed, 'worldValidator', () => validateWorld(world));
  world.debug = buildWorldDebugData(world, validation);
  assertValidWorld(world);
  return world;
}
