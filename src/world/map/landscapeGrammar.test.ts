import { describe, expect, it } from 'vitest';
import { LANDSCAPE_RECIPES } from './landscapeGrammar';

describe('landscapeGrammar', () => {
  it('definiert raeumliche Muster statt zufaelliger Biom-Streumengen', () => {
    expect(LANDSCAPE_RECIPES.industrial.patterns.map((pattern) => pattern.kind))
      .toEqual(expect.arrayContaining(['line', 'cluster']));
    expect(LANDSCAPE_RECIPES.ruins.patterns.map((pattern) => pattern.kind)).toContain('arc');
    expect(LANDSCAPE_RECIPES.crater.patterns.map((pattern) => pattern.kind)).toContain('island');
    expect(JSON.stringify(LANDSCAPE_RECIPES)).not.toContain('scatter');
  });

  it('deckt alle Biome mit grossen, mittleren und kleinen Kompositionen ab', () => {
    for (const recipe of Object.values(LANDSCAPE_RECIPES)) {
      expect(new Set(recipe.patterns.map((pattern) => pattern.size)))
        .toEqual(new Set(['large', 'medium', 'small']));
    }
  });

  it('ordnet jede moegliche Komposition einer expliziten Biom-Demand-Class zu', () => {
    for (const recipe of Object.values(LANDSCAPE_RECIPES)) {
      for (const pattern of recipe.patterns) {
        expect(pattern.demandClass.startsWith(`${recipe.biomeId}.`)).toBe(true);
        expect(Number.isInteger(pattern.requiredVariants)).toBe(true);
        expect(pattern.requiredVariants).toBeGreaterThan(0);
      }
    }
  });
});
