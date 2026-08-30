import { describe, expect, it } from 'vitest';
import { generateMacroStructure } from './macroStructure';
import { generateRegions, isRegionConnected, selectActiveBiomes } from './regionGenerator';
import { createSeedStream } from './seedStreams';
import { createGridSpec } from './worldGrid';
import { generateWorldDNA } from './worldDNA';
import { derivePotentials, generateWorldFields } from './worldFields';
import type { DerivedPotentials } from './worldTypes';

function relevanceFixture(values: [number, number, number, number, number]): DerivedPotentials {
  const grid = createGridSpec(2, 2, 10);
  const fill = (value: number): Float32Array => new Float32Array(4).fill(value);
  return {
    grid,
    scrap: fill(values[0]),
    building: fill(values[1]),
    mud: fill(values[2]),
    ruin: fill(values[3]),
    crater: fill(values[4]),
  };
}

function generateRegionFixture(seed: number) {
  const grid = createGridSpec(32, 24, 10);
  const dna = generateWorldDNA(seed);
  const macro = generateMacroStructure(dna, grid, createSeedStream(seed, 'macro'));
  const fields = generateWorldFields(dna, macro, grid, createSeedStream(seed, 'fields'));
  const potentials = derivePotentials(fields);
  return generateRegions(grid, fields, potentials, selectActiveBiomes(potentials), dna, createSeedStream(seed, 'regions'));
}

describe('regionGenerator', () => {
  it('aktiviert das beste Spezialbiom unter dem Schwellwert und deckelt bei vier', () => {
    expect(selectActiveBiomes(relevanceFixture([0.2, 0.1, 0.05, 0.15, 0.12])).biomes).toEqual(['scrap']);
    expect(selectActiveBiomes(relevanceFixture([0.9, 0.8, 0.7, 0.6, 0.5])).biomes).toHaveLength(4);
  });

  it('verwendet Oednis nur als unbeanspruchten Rest ohne eigene Keime', () => {
    const map = generateRegionFixture(33);
    expect(map.seeds.map((seed) => String(seed.biomeId))).not.toContain('wasteland');
    expect(map.biomeByCell).toContain('wasteland');
  });

  it('gibt jeder Zelle genau ein Biom und eine zusammenhaengende Region', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = generateRegionFixture(seed);
      expect(map.biomeByCell).toHaveLength(map.grid.cols * map.grid.rows);
      expect(map.regionByCell).toHaveLength(map.grid.cols * map.grid.rows);
      expect(map.biomeByCell.every(Boolean)).toBe(true);
      expect(map.regionByCell.every(Boolean)).toBe(true);
      for (const region of map.regions) expect(isRegionConnected(map, region.id)).toBe(true);
    }
  });

  it('trennt Biom- und Regionsidentitaet', () => {
    const map = generateRegionFixture(19);
    expect(new Set(map.regions.map((region) => region.id)).size).toBe(map.regions.length);
    for (let cell = 0; cell < map.regionByCell.length; cell++) {
      const region = map.regions.find((candidate) => candidate.id === map.regionByCell[cell]);
      expect(region?.biomeId).toBe(map.biomeByCell[cell]);
      expect(region?.id).not.toBe(region?.biomeId);
    }
  });
});
