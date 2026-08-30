import { describe, expect, it } from 'vitest';
import { createSeedStream } from './seedStreams';
import { FIELD_GRID } from './worldGrid';
import { generateWorldDNA } from './worldDNA';
import { generateMacroStructure } from './macroStructure';

describe('generateMacroStructure', () => {
  it('setzt zwei bis vier Makroeinfluesse innerhalb der zentrierten Extents', () => {
    const macro = generateMacroStructure(generateWorldDNA(7), FIELD_GRID, createSeedStream(7, 'macro'));
    expect(macro.influences.length).toBeGreaterThanOrEqual(2);
    expect(macro.influences.length).toBeLessThanOrEqual(4);
    for (const influence of macro.influences) {
      expect(Math.abs(influence.center.x)).toBeLessThan(400);
      expect(Math.abs(influence.center.z)).toBeLessThan(320);
      expect(influence.radiusX).toBeGreaterThan(0);
      expect(influence.radiusZ).toBeGreaterThan(0);
    }
  });

  it('waehlt getrennte, reproduzierbare Zentren statt freier Einzelwuerfe', () => {
    const a = generateMacroStructure(generateWorldDNA(91), FIELD_GRID, createSeedStream(91, 'macro'));
    const b = generateMacroStructure(generateWorldDNA(91), FIELD_GRID, createSeedStream(91, 'macro'));
    expect(a).toEqual(b);
    for (let i = 0; i < a.influences.length; i++) {
      for (let j = i + 1; j < a.influences.length; j++) {
        const x = a.influences[i]!.center.x - a.influences[j]!.center.x;
        const z = a.influences[i]!.center.z - a.influences[j]!.center.z;
        expect(Math.hypot(x, z)).toBeGreaterThan(80);
      }
    }
  });
});
