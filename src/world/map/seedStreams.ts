import { createRng, type Rng } from '../../core/rng';

export type SeedStreamLabel =
  | 'dna'
  | 'macro'
  | 'fields'
  | 'regions'
  | 'sites'
  | 'graph'
  | 'routing'
  | 'landscape'
  | 'visuals';

export function seedForStream(seed: number, label: SeedStreamLabel): number {
  let hash = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < label.length; i++) {
    hash = Math.imul(hash ^ label.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash;
}

export function createSeedStream(seed: number, label: SeedStreamLabel): Rng {
  return createRng(seedForStream(seed, label));
}
