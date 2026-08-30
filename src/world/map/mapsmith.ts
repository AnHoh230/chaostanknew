import type { DebugLayer } from './worldDebugProjection';

export interface MapsmithState {
  aktiv: boolean;
  generatorId: 'hybrid';
  seed: number;
  layer: DebugLayer;
}

export function createMapsmith(generatorId: 'hybrid', seed: number): MapsmithState {
  return { aktiv: false, generatorId, seed, layer: 'regions' };
}

/** Deterministischer Seed-Schritt (LCG) — kein Math.random in der Engine-Loop nötig. */
export function naechsterSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

/** Fertige Zeile fuer die von Hand kuratierte Seed-Bibliothek. */
export function kuratierteZeile(state: MapsmithState): string {
  return `{ id: 'hybrid_${state.seed}', generatorId: 'hybrid', seed: ${state.seed} },`;
}
