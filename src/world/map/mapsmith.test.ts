import { describe, it, expect } from 'vitest';
import { createMapsmith, naechsterSeed, kuratierteZeile } from './mapsmith';
import { CURATED, waehleKarte } from './curatedMaps';

describe('Mapsmith (Phase 7)', () => {
  it('createMapsmith startet inaktiv mit Rezept/Seed', () => {
    const s = createMapsmith('hybrid', 1337);
    expect(s).toEqual({ aktiv: false, generatorId: 'hybrid', seed: 1337, layer: 'regions' });
  });

  it('naechsterSeed ist deterministisch und ändert den Seed', () => {
    expect(naechsterSeed(1337)).toBe(naechsterSeed(1337));
    expect(naechsterSeed(1337)).not.toBe(1337);
  });

  it('kuratierteZeile enthält Rezept und Seed (zum Einfügen in curatedMaps.ts)', () => {
    const z = kuratierteZeile(createMapsmith('hybrid', 42));
    expect(z).toContain('hybrid');
    expect(z).toContain('42');
  });
});

describe('Kuratierte Bibliothek (Phase 7)', () => {
  it('enthält mindestens eine Karte', () => {
    expect(CURATED.length).toBeGreaterThan(0);
  });
  it('waehleKarte wählt eine Bibliotheks-Karte und wrappt den Index', () => {
    expect(CURATED).toContainEqual(waehleKarte(0));
    expect(waehleKarte(CURATED.length)).toEqual(waehleKarte(0));
  });
});
