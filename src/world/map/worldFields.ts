import type { Rng } from '../../core/rng';
import { cellCenter } from './worldGrid';
import type { DerivedPotentials, GridSpec, MacroStructure, WorldDNA, WorldFields } from './worldTypes';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hash01(x: number, z: number, seed: number): number {
  let h = Math.imul(x ^ seed, 0x27d4eb2d);
  h = Math.imul(h ^ z, 0x165667b1);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}

function fade(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise01(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const tx = fade(x - x0), tz = fade(z - z0);
  const a = hash01(x0, z0, seed);
  const b = hash01(x0 + 1, z0, seed);
  const c = hash01(x0, z0 + 1, seed);
  const d = hash01(x0 + 1, z0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * tz;
}

function fbm01(x: number, z: number, seed: number): number {
  let sum = 0, amplitude = 1, amplitudeSum = 0, frequency = 1;
  for (let octave = 0; octave < 4; octave++) {
    sum += valueNoise01(x * frequency, z * frequency, seed + octave * 1013) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / amplitudeSum;
}

function macroValue(
  macro: MacroStructure,
  point: { x: number; z: number },
  key: keyof MacroStructure['influences'][number]['weights'],
  fallback: number,
): number {
  let sum = 0;
  let weightSum = 0;
  for (const influence of macro.influences) {
    const dx = point.x - influence.center.x;
    const dz = point.z - influence.center.z;
    const cos = Math.cos(-influence.angle), sin = Math.sin(-influence.angle);
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    const distance2 = (rx * rx) / (influence.radiusX * influence.radiusX)
      + (rz * rz) / (influence.radiusZ * influence.radiusZ);
    const weight = Math.exp(-distance2 * 1.5);
    sum += influence.weights[key] * weight;
    weightSum += weight;
  }
  return weightSum > 0.02 ? sum / weightSum : fallback;
}

function createField(
  grid: GridSpec,
  dnaLevel: number,
  macro: MacroStructure,
  macroKey: keyof MacroStructure['influences'][number]['weights'],
  sharedSeed: number,
  specificSeed: number,
): Float32Array {
  const values = new Float32Array(grid.cols * grid.rows);
  for (let index = 0; index < values.length; index++) {
    const point = cellCenter(grid, index);
    const nx = (point.x + grid.extents.halfX) / (grid.extents.halfX * 2);
    const nz = (point.z + grid.extents.halfZ) / (grid.extents.halfZ * 2);
    const shared = fbm01(nx * 2.2, nz * 2.2, sharedSeed);
    const specific = fbm01(nx * 3.1, nz * 3.1, specificSeed);
    const noise = shared * 0.55 + specific * 0.45;
    const localMacro = macroValue(macro, point, macroKey, dnaLevel);
    values[index] = clamp01(dnaLevel * 0.65 + noise * 0.25 + localMacro * 0.1);
  }
  return values;
}

export function generateWorldFields(
  dna: WorldDNA,
  macro: MacroStructure,
  grid: GridSpec,
  rng: Rng,
): WorldFields {
  const sharedSeed = rng.int(0x7fffffff);
  return {
    grid,
    openness: createField(grid, dna.openness, macro, 'openness', sharedSeed, rng.int(0x7fffffff)),
    industrial: createField(grid, dna.industrialization, macro, 'industrialization', sharedSeed, rng.int(0x7fffffff)),
    wetness: createField(grid, dna.wetness, macro, 'wetness', sharedSeed, rng.int(0x7fffffff)),
    destruction: createField(grid, dna.destruction, macro, 'destruction', sharedSeed, rng.int(0x7fffffff)),
  };
}

export function derivePotentials(fields: WorldFields): DerivedPotentials {
  const size = fields.grid.cols * fields.grid.rows;
  const scrap = new Float32Array(size);
  const building = new Float32Array(size);
  const ruin = new Float32Array(size);
  const mud = new Float32Array(size);
  const crater = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const open = fields.openness[i]!;
    const industrial = fields.industrial[i]!;
    const wet = fields.wetness[i]!;
    const destruction = fields.destruction[i]!;
    scrap[i] = clamp01(industrial * 0.35 + destruction * 0.45 + (1 - open) * 0.2);
    building[i] = clamp01(industrial * 0.7 + (1 - destruction) * 0.2 + (1 - open) * 0.1);
    ruin[i] = clamp01(industrial * 0.25 + destruction * 0.6 + (1 - open) * 0.15);
    mud[i] = clamp01(wet * 0.75 + (1 - open) * 0.15 + (1 - industrial) * 0.1);
    crater[i] = clamp01(destruction * 0.65 + open * 0.2 + (1 - wet) * 0.15);
  }
  return { grid: fields.grid, scrap, building, ruin, mud, crater };
}
