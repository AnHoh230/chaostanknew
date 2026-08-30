import { describe, expect, it } from 'vitest';
import { generateMacroStructure } from './macroStructure';
import { generateRegions, selectActiveBiomes } from './regionGenerator';
import { createSeedStream } from './seedStreams';
import { generateSites } from './siteGenerator';
import { cellAtWorld, createGridSpec } from './worldGrid';
import { generateWorldDNA } from './worldDNA';
import { derivePotentials, generateWorldFields } from './worldFields';

function generateSiteFixture(seed: number) {
  const grid = createGridSpec(48, 36, 10);
  const dna = generateWorldDNA(seed);
  const macro = generateMacroStructure(dna, grid, createSeedStream(seed, 'macro'));
  const fields = generateWorldFields(dna, macro, grid, createSeedStream(seed, 'fields'));
  const potentials = derivePotentials(fields);
  const regions = generateRegions(grid, fields, potentials, selectActiveBiomes(potentials), dna, createSeedStream(seed, 'regions'));
  return { grid, regions, sites: generateSites(grid, fields, regions, dna, createSeedStream(seed, 'sites')) };
}

describe('generateSites', () => {
  it('behandelt den Ursprung als vollstaendige Spawn-Site', () => {
    expect(generateSiteFixture(1).sites[0]).toMatchObject({ id: 'spawn', center: { x: 0, z: 0 }, radius: 24, accessBand: 12 });
  });

  it('erzeugt sieben bis elf getrennte Sites mitsamt Zugangsband innerhalb der Karte', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { grid, sites } = generateSiteFixture(seed);
      expect(sites.length).toBeGreaterThanOrEqual(7);
      expect(sites.length).toBeLessThanOrEqual(11);
      for (const site of sites) {
        expect(Math.abs(site.center.x) + site.radius + site.accessBand).toBeLessThanOrEqual(grid.extents.halfX);
        expect(Math.abs(site.center.z) + site.radius + site.accessBand).toBeLessThanOrEqual(grid.extents.halfZ);
      }
      for (let i = 0; i < sites.length; i++) {
        for (let j = i + 1; j < sites.length; j++) {
          const a = sites[i]!, b = sites[j]!;
          const free = Math.hypot(a.center.x - b.center.x, a.center.z - b.center.z)
            - (a.radius + a.accessBand) - (b.radius + b.accessBand);
          expect(free).toBeGreaterThanOrEqual(35);
        }
      }
    }
  });

  it('uebernimmt Biom und Region aus der tatsaechlichen Site-Zelle', () => {
    const { grid, regions, sites } = generateSiteFixture(44);
    for (const site of sites) {
      const cell = cellAtWorld(grid, site.center)!;
      expect(site.regionId).toBe(regions.regionByCell[cell.index]);
      expect(site.biomeId).toBe(regions.biomeByCell[cell.index]);
    }
  });

  it('ist deterministisch', () => {
    expect(generateSiteFixture(88).sites).toEqual(generateSiteFixture(88).sites);
  });
});
