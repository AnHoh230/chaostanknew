import { createSeedStream } from './seedStreams';
import type { WorldDNA } from './worldTypes';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function generateWorldDNA(seed: number, override: Partial<WorldDNA> = {}): WorldDNA {
  const rng = createSeedStream(seed, 'dna');
  const openness = rng.next();
  const industrialization = rng.next();
  const destruction = rng.next();
  const wetness = rng.next();
  const dna: WorldDNA = {
    openness,
    industrialization,
    destruction,
    wetness,
    axisStrength: clamp01(industrialization * 0.45 + (1 - openness) * 0.2 + rng.next() * 0.35),
    structuralDensity: clamp01((1 - openness) * 0.5 + industrialization * 0.25 + destruction * 0.15 + rng.next() * 0.1),
    targetRegionScale: clamp01(openness * 0.5 + (1 - destruction) * 0.2 + rng.next() * 0.3),
    roadDensity: clamp01(industrialization * 0.45 + (1 - openness) * 0.25 + rng.next() * 0.3),
    clusterStrength: clamp01((1 - openness) * 0.45 + destruction * 0.35 + rng.next() * 0.2),
  };
  return { ...dna, ...override };
}
