import type { Rng } from '../../core/rng';
import type { Vec2 } from './mapTypes';
import type { GridSpec, MacroInfluence, MacroStructure, WorldDNA } from './worldTypes';

interface Candidate { center: Vec2; noise: number }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function generateMacroStructure(dna: WorldDNA, grid: GridSpec, rng: Rng): MacroStructure {
  const axisAngle = rng.range(0, Math.PI * 2);
  const stepX = (grid.extents.halfX * 2) / 3;
  const stepZ = (grid.extents.halfZ * 2) / 3;
  const candidates: Candidate[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      candidates.push({
        center: {
          x: -grid.extents.halfX + (col + 0.5) * stepX + rng.range(-stepX * 0.16, stepX * 0.16),
          z: -grid.extents.halfZ + (row + 0.5) * stepZ + rng.range(-stepZ * 0.16, stepZ * 0.16),
        },
        noise: rng.next(),
      });
    }
  }

  const wanted = 2 + rng.int(3);
  const selected: Candidate[] = [];
  const diagonal = Math.hypot(grid.extents.halfX * 2, grid.extents.halfZ * 2);
  while (selected.length < wanted) {
    let best: Candidate | undefined;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;
      const minDistance = selected.length === 0
        ? Math.hypot(candidate.center.x, candidate.center.z)
        : Math.min(...selected.map((other) => distance(candidate.center, other.center)));
      if (selected.length > 0 && minDistance <= 80) continue;
      const projection = Math.abs(
        candidate.center.x * Math.cos(axisAngle) + candidate.center.z * Math.sin(axisAngle),
      ) / Math.max(grid.extents.halfX, grid.extents.halfZ);
      const dnaFit = candidate.noise * 0.5 + dna.structuralDensity * 0.3 + dna.axisStrength * projection * 0.2;
      const score = selected.length === 0
        ? dnaFit
        : dnaFit * 0.5 + (minDistance / diagonal) * 0.3 + projection * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) throw new Error('macro-centers-unplaceable');
    selected.push(best);
  }

  const influences: MacroInfluence[] = selected.map((candidate, index) => {
    const baseRadius = rng.range(105, 175);
    const stretch = 1 + dna.axisStrength * rng.range(0.15, 0.55);
    return {
      id: `macro_${index}`,
      center: candidate.center,
      radiusX: baseRadius * stretch,
      radiusZ: baseRadius / stretch,
      angle: axisAngle + rng.range(-0.45, 0.45),
      weights: {
        openness: clamp01(dna.openness + rng.range(-0.35, 0.35)),
        industrialization: clamp01(dna.industrialization + rng.range(-0.35, 0.35)),
        destruction: clamp01(dna.destruction + rng.range(-0.35, 0.35)),
        wetness: clamp01(dna.wetness + rng.range(-0.35, 0.35)),
      },
    };
  });

  return { axisAngle, axisStrength: dna.axisStrength, influences };
}
