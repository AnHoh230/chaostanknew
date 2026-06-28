import { describe, it, expect } from 'vitest';
import { entityBeschriftung } from './mapLabels';

describe('entityBeschriftung', () => {
  it('benennt bekannte Assets mit Symbol + Name', () => {
    expect(entityBeschriftung('fass', 'breakable')).toContain('Fass');
    expect(entityBeschriftung('presse', 'hazard')).toContain('Presse');
    expect(entityBeschriftung('funkturm', 'landmark')).toContain('Funkturm');
    expect(entityBeschriftung('fund_huhn', 'collectible')).toContain('Heilung');
  });

  it('fällt bei unbekanntem Asset auf die Kind-Kategorie zurück', () => {
    expect(entityBeschriftung('xyz_unbekannt', 'hazard')).toContain('Falle');
    expect(entityBeschriftung('xyz_unbekannt', 'collectible')).toContain('Fund');
  });

  it('fällt bei unbekanntem Asset UND Kind auf die Asset-Id zurück', () => {
    expect(entityBeschriftung('voellig_neu', 'rakete')).toBe('voellig_neu');
  });
});
