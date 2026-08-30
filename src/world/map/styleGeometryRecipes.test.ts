import { describe, expect, it } from 'vitest';
import * as recipeModule from './styleGeometryRecipes';
import {
  assertPrimitivesFit,
  buildStyleGeometryRecipe,
  IRONWASTE_RECIPE_IDS,
} from './styleGeometryRecipes';

describe('styleGeometryRecipes exports', () => {
  it('stellt Rezeptliste, Fabrik und Huellepruefung bereit', () => {
    const exported = recipeModule as unknown as Record<string, unknown>;
    expect(exported.IRONWASTE_RECIPE_IDS).toBeInstanceOf(Array);
    expect(exported.buildStyleGeometryRecipe).toBeTypeOf('function');
    expect(exported.assertPrimitivesFit).toBeTypeOf('function');
  });
});

describe('styleGeometryRecipes', () => {
  it('deckt jedes im Ironwaste-Kit verwendete Geometrierezept ab', () => {
    expect(IRONWASTE_RECIPE_IDS).toEqual([
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
    ]);
    for (const recipeId of IRONWASTE_RECIPE_IDS) {
      const footprint = { halfX: 8, halfZ: 6 };
      const primitives = buildStyleGeometryRecipe(recipeId, footprint, `${recipeId}.v2`);
      expect(primitives.length, recipeId).toBeGreaterThan(0);
      expect(() => assertPrimitivesFit(primitives, footprint, recipeId)).not.toThrow();
    }
  });

  it('skaliert kleine Breakable-Rezepte in die echte Generatorhuelle', () => {
    const footprint = { halfX: 1.5, halfZ: 1.5 };
    const primitives = buildStyleGeometryRecipe('industrial-breakable-edge', footprint, 'small.v1');

    expect(() => assertPrimitivesFit(primitives, footprint, 'small')).not.toThrow();
  });

  it('erzeugt Varianten mit anderer lokaler Anordnung aber derselben Huelle', () => {
    const footprint = { halfX: 5, halfZ: 4 };
    const first = buildStyleGeometryRecipe('scrap-wreck-cluster', footprint, 'wreck.v1');
    const second = buildStyleGeometryRecipe('scrap-wreck-cluster', footprint, 'wreck.v2');

    expect(first).not.toEqual(second);
    expect(() => assertPrimitivesFit(first, footprint, 'wreck.v1')).not.toThrow();
    expect(() => assertPrimitivesFit(second, footprint, 'wreck.v2')).not.toThrow();
  });

  it('haelt alle Wasteland-Rezepte auch in ihren kleinsten Generatorhuellen', () => {
    const cases = [
      ['wasteland-cover-cluster', { halfX: 1.5, halfZ: 1.5 }],
      ['wasteland-destructible-blob', { halfX: 3, halfZ: 3 }],
      ['wasteland-landmark-island', { halfX: 4.5, halfZ: 4.5 }],
    ] as const;

    for (const [recipeId, footprint] of cases) {
      const primitives = buildStyleGeometryRecipe(recipeId, footprint, `${recipeId}.v3`);
      expect(primitives.length, recipeId).toBeGreaterThanOrEqual(3);
      expect(() => assertPrimitivesFit(primitives, footprint, recipeId)).not.toThrow();
    }
  });

  it('verwirft unbekannte Rezepte und Primitive ausserhalb der Huelle', () => {
    expect(() => buildStyleGeometryRecipe('unknown', { halfX: 3, halfZ: 3 }, 'v1'))
      .toThrow('unsupported-style-geometry-recipe:unknown');
    expect(() => assertPrimitivesFit([{
      shape: 'box',
      center: { x: 2.8, y: 0.5, z: 0 },
      size: { x: 1, y: 1, z: 1 },
      rotationY: Math.PI / 4,
      paletteSlot: 'rust',
    }], { halfX: 3, halfZ: 3 }, 'outside'))
      .toThrow('style-primitive-outside-footprint:outside:0');
  });
});
