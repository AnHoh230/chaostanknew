import { describe, expect, it } from 'vitest';
import { createSeedStream } from './seedStreams';
import { createGridSpec } from './worldGrid';
import { derivePotentials, generateWorldFields } from './worldFields';
import type { MacroStructure, WorldDNA, WorldFields } from './worldTypes';

const GRID = createGridSpec(12, 8, 10);

function dna(overrides: Partial<WorldDNA> = {}): WorldDNA {
  return {
    openness: 0.5,
    industrialization: 0.5,
    destruction: 0.5,
    wetness: 0.5,
    axisStrength: 0.5,
    structuralDensity: 0.5,
    targetRegionScale: 0.5,
    roadDensity: 0.5,
    clusterStrength: 0.5,
    ...overrides,
  };
}

function macro(forDna: WorldDNA): MacroStructure {
  return {
    axisAngle: 0,
    axisStrength: forDna.axisStrength,
    influences: [{
      id: 'center', center: { x: 0, z: 0 }, radiusX: 60, radiusZ: 40, angle: 0,
      weights: {
        openness: forDna.openness,
        industrialization: forDna.industrialization,
        destruction: forDna.destruction,
        wetness: forDna.wetness,
      },
    }],
  };
}

function oneCellFields(values: { openness: number; industrial: number; wetness: number; destruction: number }): WorldFields {
  const grid = createGridSpec(1, 1, 10);
  return {
    grid,
    openness: new Float32Array([values.openness]),
    industrial: new Float32Array([values.industrial]),
    wetness: new Float32Array([values.wetness]),
    destruction: new Float32Array([values.destruction]),
  };
}

describe('worldFields', () => {
  it('streckt eine kaum industrialisierte Welt nicht auf industrial 1', () => {
    const lowDna = dna({ industrialization: 0.05 });
    const fields = generateWorldFields(lowDna, macro(lowDna), GRID, createSeedStream(7, 'fields'));
    expect(Math.max(...fields.industrial)).toBeLessThan(0.65);
  });

  it('leitet Potentiale aus den vier geographischen Ursachen ab', () => {
    const potentials = derivePotentials(oneCellFields({ openness: 0.2, industrial: 0.9, wetness: 0.1, destruction: 0.8 }));
    expect(potentials.ruin[0]).toBeGreaterThan(potentials.mud[0]!);
    expect(potentials.building[0]).toBeGreaterThan(0.4);
  });

  it('erzeugt fuer denselben Stream identische Typed Arrays', () => {
    const worldDna = dna();
    const a = generateWorldFields(worldDna, macro(worldDna), GRID, createSeedStream(91, 'fields'));
    const b = generateWorldFields(worldDna, macro(worldDna), GRID, createSeedStream(91, 'fields'));
    expect([...a.openness, ...a.industrial, ...a.wetness, ...a.destruction])
      .toEqual([...b.openness, ...b.industrial, ...b.wetness, ...b.destruction]);
  });
});
