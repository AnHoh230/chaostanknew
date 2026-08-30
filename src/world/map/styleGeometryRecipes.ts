import type { Footprint } from './worldTypes';

export const IRONWASTE_RECIPE_IDS = [
  'industrial-breakable-edge',
  'industrial-container-and-pipe-cluster',
  'industrial-wall-and-hall-shell',
  'industrial-yard',
  'scrap-landmark-island',
  'scrap-pile',
  'scrap-wreck-cluster',
  'scrap-yard',
  'site-entrance',
  'wasteland-cover-cluster',
  'wasteland-destructible-blob',
  'wasteland-landmark-island',
] as const;

export type IronwasteRecipeId = typeof IRONWASTE_RECIPE_IDS[number];
export type StylePrimitiveShape = 'box' | 'cylinder';

export interface StylePrimitive {
  shape: StylePrimitiveShape;
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotationY: number;
  paletteSlot: string;
}

interface RecipeContext {
  hx: number;
  hz: number;
  height: number;
  mirror: number;
  shift: number;
}

type Recipe = (context: RecipeContext) => StylePrimitive[];

function primitive(
  context: RecipeContext,
  shape: StylePrimitiveShape,
  centerX: number,
  centerZ: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  paletteSlot: string,
  rotationY = 0,
): StylePrimitive {
  return {
    shape,
    center: {
      x: centerX * context.hx,
      y: sizeY / 2,
      z: centerZ * context.hz,
    },
    size: {
      x: Math.max(0.08, sizeX * context.hx),
      y: Math.max(0.08, sizeY),
      z: Math.max(0.08, sizeZ * context.hz),
    },
    rotationY,
    paletteSlot,
  };
}

const RECIPES: Record<IronwasteRecipeId, Recipe> = {
  'industrial-breakable-edge': (c) => [
    primitive(c, 'box', -0.45, c.shift, 0.42, c.height * 0.55, 0.28, 'rust', c.mirror * 0.08),
    primitive(c, 'box', 0, -c.shift, 0.36, c.height * 0.72, 0.32, 'steel', -c.mirror * 0.06),
    primitive(c, 'box', 0.45, c.shift, 0.42, c.height * 0.48, 0.26, 'rust', c.mirror * 0.1),
  ],
  'industrial-container-and-pipe-cluster': (c) => [
    primitive(c, 'box', -0.3 * c.mirror, -0.22, 0.65, c.height, 0.34, 'steel', c.mirror * 0.12),
    primitive(c, 'box', 0.32 * c.mirror, 0.24, 0.5, c.height * 0.82, 0.3, 'graphite', -c.mirror * 0.18),
    primitive(c, 'cylinder', 0.38 * c.mirror, -0.34, 0.22, c.height * 0.62, 0.22, 'rust'),
  ],
  'industrial-wall-and-hall-shell': (c) => [
    primitive(c, 'box', -0.78, 0.05, 0.18, c.height * 1.55, 1.55, 'concrete'),
    primitive(c, 'box', 0.78, 0.05, 0.18, c.height * 1.55, 1.55, 'concrete'),
    primitive(c, 'box', 0, 0.78, 1.38, c.height * 1.35, 0.18, 'steel'),
    primitive(c, 'box', c.shift, -0.1, 0.42, c.height * 0.72, 0.34, 'cyanAccent'),
  ],
  'industrial-yard': (c) => [
    primitive(c, 'box', 0, 0, 1.72, 0.16, 1.72, 'concrete'),
    primitive(c, 'box', -0.62, 0.55 * c.mirror, 0.28, c.height * 0.85, 0.5, 'steel'),
    primitive(c, 'box', 0.58, -0.48 * c.mirror, 0.34, c.height * 0.64, 0.4, 'rust'),
  ],
  'scrap-landmark-island': (c) => [
    primitive(c, 'cylinder', 0, 0, 1.45, c.height * 0.35, 1.45, 'soil'),
    primitive(c, 'box', -0.28 * c.mirror, 0.1, 0.46, c.height * 1.7, 0.4, 'steel', c.mirror * 0.2),
    primitive(c, 'cylinder', 0.34 * c.mirror, -0.22, 0.38, c.height * 0.8, 0.38, 'rust'),
    primitive(c, 'box', 0.04, 0.34, 0.58, c.height * 0.48, 0.32, 'graphite', -c.mirror * 0.28),
  ],
  'scrap-pile': (c) => [
    primitive(c, 'box', -0.26 * c.mirror, 0.08, 0.54, c.height * 0.55, 0.4, 'rust', c.mirror * 0.32),
    primitive(c, 'box', 0.22 * c.mirror, -0.14, 0.48, c.height * 0.72, 0.36, 'steel', -c.mirror * 0.27),
    primitive(c, 'cylinder', c.shift, 0.24, 0.3, c.height * 0.48, 0.3, 'graphite'),
  ],
  'scrap-wreck-cluster': (c) => [
    primitive(c, 'box', -0.34 * c.mirror, -0.2, 0.72, c.height * 0.58, 0.32, 'steel', c.mirror * 0.24),
    primitive(c, 'box', 0.28 * c.mirror, 0.24, 0.62, c.height * 0.5, 0.3, 'rust', -c.mirror * 0.34),
    primitive(c, 'cylinder', 0.06, -0.04 * c.mirror, 0.26, c.height * 0.38, 0.26, 'graphite'),
  ],
  'scrap-yard': (c) => [
    primitive(c, 'box', 0, 0, 1.72, 0.14, 1.72, 'soil'),
    primitive(c, 'box', -0.58, 0.5 * c.mirror, 0.36, c.height * 0.55, 0.42, 'rust', c.mirror * 0.16),
    primitive(c, 'cylinder', 0.52, -0.46 * c.mirror, 0.4, c.height * 0.7, 0.4, 'steel'),
    primitive(c, 'box', c.shift, 0.08, 0.5, c.height * 0.42, 0.3, 'graphite', -c.mirror * 0.24),
  ],
  'site-entrance': (c) => [
    primitive(c, 'box', -0.72, 0, 0.16, c.height * 1.2, 0.42, 'concrete'),
    primitive(c, 'box', 0.72, 0, 0.16, c.height * 1.2, 0.42, 'concrete'),
    primitive(c, 'box', 0, 0, 1.28, c.height * 0.18, 0.2, 'cyanAccent'),
  ],
  'wasteland-cover-cluster': (c) => [
    primitive(c, 'box', -0.42 * c.mirror, 0.05, 0.5, c.height * 0.34, 0.38, 'dryClay', c.mirror * 0.12),
    primitive(c, 'box', 0, -0.06, 0.5, c.height * 0.4, 0.42, 'ash', -c.mirror * 0.08),
    primitive(c, 'box', 0.42 * c.mirror, 0.05, 0.5, c.height * 0.3, 0.36, 'dryClay', c.mirror * 0.1),
    primitive(c, 'box', c.shift, 0.3, 0.82, c.height * 0.22, 0.18, 'rust', c.mirror * 0.18),
  ],
  'wasteland-destructible-blob': (c) => [
    primitive(c, 'cylinder', -0.28 * c.mirror, -0.16, 0.7, c.height * 0.42, 0.62, 'ash'),
    primitive(c, 'box', 0.24 * c.mirror, 0.18, 0.7, c.height * 0.58, 0.42, 'concrete', -c.mirror * 0.28),
    primitive(c, 'box', -0.04, 0.34 * c.mirror, 0.78, c.height * 0.28, 0.26, 'rust', c.mirror * 0.34),
    primitive(c, 'cylinder', 0.38 * c.mirror, -0.26, 0.32, c.height * 0.32, 0.32, 'bone'),
  ],
  'wasteland-landmark-island': (c) => [
    primitive(c, 'cylinder', 0, 0, 1.55, c.height * 0.3, 1.55, 'dryClay'),
    primitive(c, 'cylinder', -0.06 * c.mirror, 0.02, 1.1, c.height * 0.44, 1.08, 'ash'),
    primitive(c, 'box', -0.12 * c.mirror, -0.02, 0.18, c.height * 2.35, 0.18, 'graphite', c.mirror * 0.12),
    primitive(c, 'box', -0.03 * c.mirror, 0.02, 0.65, c.height * 0.12, 0.12, 'steel', -c.mirror * 0.18),
    primitive(c, 'box', 0.2 * c.mirror, 0.04, 0.22, c.height * 0.76, 0.2, 'cyanAccent', c.mirror * 0.16),
    primitive(c, 'box', 0.42 * c.mirror, -0.3, 0.45, c.height * 0.32, 0.28, 'rust', -c.mirror * 0.32),
  ],
};

function variantIndex(variantId: string): number {
  const suffix = /v(\d+)$/.exec(variantId)?.[1];
  if (suffix) return Number(suffix);
  let hash = 0;
  for (let index = 0; index < variantId.length; index++) hash = Math.imul(hash ^ variantId.charCodeAt(index), 16777619);
  return Math.abs(hash) + 1;
}

function rotatedHalfExtents(primitiveValue: StylePrimitive): { x: number; z: number } {
  const halfX = primitiveValue.size.x / 2;
  const halfZ = primitiveValue.size.z / 2;
  const cosine = Math.abs(Math.cos(primitiveValue.rotationY));
  const sine = Math.abs(Math.sin(primitiveValue.rotationY));
  return {
    x: cosine * halfX + sine * halfZ,
    z: sine * halfX + cosine * halfZ,
  };
}

function fitPrimitives(primitives: StylePrimitive[], footprint: Footprint): StylePrimitive[] {
  let occupiedX = 0;
  let occupiedZ = 0;
  for (const entry of primitives) {
    const extents = rotatedHalfExtents(entry);
    occupiedX = Math.max(occupiedX, Math.abs(entry.center.x) + extents.x);
    occupiedZ = Math.max(occupiedZ, Math.abs(entry.center.z) + extents.z);
  }
  const scale = Math.min(
    1,
    occupiedX > 0 ? (footprint.halfX * 0.96) / occupiedX : 1,
    occupiedZ > 0 ? (footprint.halfZ * 0.96) / occupiedZ : 1,
  );
  return primitives.map((entry) => ({
    ...entry,
    center: { ...entry.center, x: entry.center.x * scale, z: entry.center.z * scale },
    size: { ...entry.size, x: entry.size.x * scale, z: entry.size.z * scale },
  }));
}

export function assertPrimitivesFit(
  primitives: readonly StylePrimitive[],
  footprint: Footprint,
  recipeId: string,
): void {
  if (!Number.isFinite(footprint.halfX) || !Number.isFinite(footprint.halfZ)
    || footprint.halfX <= 0 || footprint.halfZ <= 0) {
    throw new Error(`invalid-style-recipe-footprint:${recipeId}`);
  }
  primitives.forEach((entry, index) => {
    const numbers = [
      entry.center.x, entry.center.y, entry.center.z,
      entry.size.x, entry.size.y, entry.size.z,
      entry.rotationY,
    ];
    const extents = rotatedHalfExtents(entry);
    const outside = numbers.some((value) => !Number.isFinite(value))
      || entry.size.x <= 0 || entry.size.y <= 0 || entry.size.z <= 0
      || Math.abs(entry.center.x) + extents.x > footprint.halfX + 1e-7
      || Math.abs(entry.center.z) + extents.z > footprint.halfZ + 1e-7;
    if (outside) throw new Error(`style-primitive-outside-footprint:${recipeId}:${index}`);
  });
}

export function buildStyleGeometryRecipe(
  recipeId: string,
  footprint: Footprint,
  variantId: string,
): StylePrimitive[] {
  const recipe = RECIPES[recipeId as IronwasteRecipeId];
  if (!recipe) throw new Error(`unsupported-style-geometry-recipe:${recipeId}`);
  if (footprint.halfX <= 0 || footprint.halfZ <= 0) throw new Error(`invalid-style-recipe-footprint:${recipeId}`);
  const index = variantIndex(variantId);
  const context: RecipeContext = {
    hx: footprint.halfX,
    hz: footprint.halfZ,
    height: Math.max(0.8, Math.min(footprint.halfX, footprint.halfZ) * 0.7),
    mirror: index % 2 === 0 ? 1 : -1,
    shift: ((index % 5) - 2) * 0.07,
  };
  const result = fitPrimitives(recipe(context), footprint);
  assertPrimitivesFit(result, footprint, recipeId);
  return result;
}
