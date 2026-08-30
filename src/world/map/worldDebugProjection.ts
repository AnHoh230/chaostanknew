import { cellCenter } from './worldGrid';
import type { Vec2 } from './mapTypes';
import type { GenerierteWelt, GridSpec } from './worldTypes';

export const DEBUG_LAYERS = [
  'dna', 'macro', 'fields', 'potentials', 'biomes', 'regions', 'sites',
  'intentGraph', 'realizedGraph', 'corridors', 'reservations', 'features', 'validation',
] as const;
export type DebugLayer = typeof DEBUG_LAYERS[number];

export interface DebugPoint { id: string; pos: Vec2; radius: number; category: string; value?: number }
export interface DebugLine { id: string; points: Vec2[]; width: number; category: string }
export interface DebugCell { id: string; cell: number; grid: GridSpec; category: string; value?: number }
export interface DebugLabel { id: string; text: string; pos?: Vec2; category: string }
export interface DebugPrimitives {
  points: DebugPoint[];
  lines: DebugLine[];
  cells: DebugCell[];
  labels: DebugLabel[];
}

function empty(): DebugPrimitives { return { points: [], lines: [], cells: [], labels: [] }; }

export function projectWorldDebug(world: GenerierteWelt, layer: DebugLayer): DebugPrimitives {
  const result = empty();
  if (layer === 'dna') {
    for (const [key, value] of Object.entries(world.dna)) {
      result.labels.push({ id: `dna_${key}`, text: `${key}: ${value.toFixed(3)}`, category: key });
    }
  } else if (layer === 'macro') {
    for (const influence of world.macro.influences) {
      result.points.push({ id: influence.id, pos: { ...influence.center }, radius: Math.max(influence.radiusX, influence.radiusZ), category: 'influence' });
    }
    const length = Math.max(world.extents.halfX, world.extents.halfZ);
    const dx = Math.cos(world.macro.axisAngle) * length, dz = Math.sin(world.macro.axisAngle) * length;
    result.lines.push({ id: 'macro_axis', points: [{ x: -dx, z: -dz }, { x: dx, z: dz }], width: 3, category: 'axis' });
  } else if (layer === 'fields') {
    const names = ['openness', 'industrial', 'wetness', 'destruction'] as const;
    names.forEach((name) => world.fields[name].forEach((value, cell) => {
      result.cells.push({ id: `${name}_${cell}`, cell, grid: world.fields.grid, category: name, value });
    }));
  } else if (layer === 'potentials') {
    const names = ['scrap', 'building', 'ruin', 'mud', 'crater'] as const;
    names.forEach((name) => world.potentials[name].forEach((value, cell) => {
      result.cells.push({ id: `${name}_${cell}`, cell, grid: world.potentials.grid, category: name, value });
    }));
  } else if (layer === 'biomes' || layer === 'regions') {
    world.regions.regionByCell.forEach((regionId, cell) => {
      result.cells.push({
        id: `${layer}_${cell}`,
        cell,
        grid: world.regions.grid,
        category: layer === 'biomes' ? world.regions.biomeByCell[cell]! : regionId,
      });
    });
  } else if (layer === 'sites') {
    world.sites.forEach((site) => result.points.push({ id: site.id, pos: { ...site.center }, radius: site.radius + site.accessBand, category: site.biomeId }));
  } else if (layer === 'intentGraph') {
    const sites = new Map(world.sites.map((site) => [site.id, site]));
    world.intentGraph.edges.forEach((edge, index) => result.lines.push({
      id: `intent_${index}`,
      points: [{ ...sites.get(edge.a)!.center }, { ...sites.get(edge.b)!.center }],
      width: 2,
      category: 'intent',
    }));
  } else if (layer === 'realizedGraph') {
    const nodes = new Map(world.realizedGraph.nodes.map((node) => [node.id, node]));
    world.realizedGraph.nodes.forEach((node) => result.points.push({ id: node.id, pos: { ...node.pos }, radius: node.kind === 'site' ? 6 : 3, category: node.kind }));
    world.realizedGraph.edges.forEach((edge) => result.lines.push({
      id: edge.id,
      points: [{ ...nodes.get(edge.a)!.pos }, { ...nodes.get(edge.b)!.pos }],
      width: 2,
      category: 'realized',
    }));
  } else if (layer === 'corridors') {
    world.corridors.forEach((corridor) => result.lines.push({ id: corridor.id, points: corridor.centerline.map((point) => ({ ...point })), width: corridor.width, category: 'corridor' }));
  } else if (layer === 'reservations') {
    world.reservations.forEach((reservation) => reservation.cells.forEach((cell) => result.cells.push({
      id: `${reservation.id}_${cell}`, cell, grid: reservation.grid, category: reservation.type,
    })));
  } else if (layer === 'features') {
    world.features.forEach((feature) => result.points.push({
      id: feature.id,
      pos: { ...feature.position },
      radius: Math.max(feature.footprint.halfX, feature.footprint.halfZ),
      category: `${feature.biomeId}:${feature.shape}:${feature.role}`,
    }));
  } else {
    if (world.debug.validation.hardFailures.length === 0) {
      result.labels.push({ id: 'validation_ok', text: 'valid', category: 'valid' });
    } else {
      world.debug.validation.hardFailures.forEach((failure, index) => result.labels.push({
        id: `validation_${index}`, text: `${failure.invariant}: ${failure.detail}`, category: 'failure',
      }));
    }
    result.labels.push({ id: 'signature', text: world.debug.quality.signature, category: 'signature', pos: cellCenter(world.fields.grid, 0) });
  }
  return result;
}
