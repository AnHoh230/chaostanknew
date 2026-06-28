import { describe, it, expect } from 'vitest';
import {
  parseMuster, zelleBei, glyphArt, transform, seiteTransform, footprint, anschlussZelle,
  type ModulDef,
} from './muster';

describe('parseMuster', () => {
  it('liest ein rechteckiges Raster ein (w/h korrekt)', () => {
    const g = parseMuster(['AB', 'CD', 'EF']);
    expect(g.w).toBe(2);
    expect(g.h).toBe(3);
    expect(zelleBei(g, 0, 0)).toBe('A');
    expect(zelleBei(g, 1, 2)).toBe('F');
  });

  it('wirft bei ungleich langen Zeilen', () => {
    expect(() => parseMuster(['ABC', 'DE'])).toThrow();
  });
});

describe('glyphArt', () => {
  it('ordnet Prop-Glyphen ihrer Art zu', () => {
    expect(glyphArt('#')).toBe('wand');
    expect(glyphArt('B')).toBe('cargo');
    expect(glyphArt('o')).toBe('breakable');
    expect(glyphArt('X')).toBe('hazard');
    expect(glyphArt('*')).toBe('pickup');
    expect(glyphArt('!')).toBe('fokus');
    expect(glyphArt('n')).toBe('nest');
    expect(glyphArt('=')).toBe('tor');
    expect(glyphArt('.')).toBe('boden');
    expect(glyphArt('?')).toBe('leer'); // unbekannt -> leer
  });
});

describe('transform', () => {
  it('rot 0 ohne Spiegelung ist die Identität', () => {
    const g = parseMuster(['AB', 'CD']);
    const r = transform(g, 0, false);
    expect(r.zellen.join('')).toBe('ABCD');
  });

  it('dreht 90° im Uhrzeigersinn korrekt (Dimensionen tauschen)', () => {
    const g = parseMuster(['AB', 'CD', 'EF']); // w2 h3
    const r = transform(g, 1, false); // -> w3 h2
    expect(r.w).toBe(3);
    expect(r.h).toBe(2);
    expect(zelleBei(r, 0, 0)).toBe('E');
    expect(zelleBei(r, 2, 0)).toBe('A');
    expect(zelleBei(r, 0, 1)).toBe('F');
    expect(zelleBei(r, 2, 1)).toBe('B');
  });

  it('viermal 90° ist wieder die Identität', () => {
    const g = parseMuster(['AB', 'CD', 'EF']);
    let r = g;
    for (let i = 0; i < 4; i++) r = transform(r, 1, false);
    expect(r.w).toBe(2);
    expect(r.h).toBe(3);
    expect(r.zellen.join('')).toBe('ABCDEF');
  });

  it('spiegelt in X', () => {
    const g = parseMuster(['AB', 'CD']);
    const r = transform(g, 0, true);
    expect(r.zellen.join('')).toBe('BADC');
  });
});

describe('seiteTransform', () => {
  it('dreht Anschluss-Seiten im Uhrzeigersinn', () => {
    expect(seiteTransform('N', 1, false)).toBe('O');
    expect(seiteTransform('O', 1, false)).toBe('S');
    expect(seiteTransform('N', 2, false)).toBe('S');
  });
  it('spiegelt O<->W, N/S bleiben', () => {
    expect(seiteTransform('O', 0, true)).toBe('W');
    expect(seiteTransform('N', 0, true)).toBe('N');
  });
});

describe('footprint & anschlussZelle', () => {
  const def: ModulDef = {
    id: 't', rolle: 'major', theme: 'depot', rows: ['AB', 'CD', 'EF'],
    kosten: 1, wand: 'none', anschluesse: [], drehbar: true, spiegelbar: false,
  };
  it('vertauscht Footprint bei 90°/270°', () => {
    expect(footprint(def, 0)).toEqual({ w: 2, h: 3 });
    expect(footprint(def, 1)).toEqual({ w: 3, h: 2 });
    expect(footprint(def, 2)).toEqual({ w: 2, h: 3 });
  });
  it('liefert die Kantenmitte je Seite', () => {
    expect(anschlussZelle(4, 2, 'O')).toEqual({ x: 3, z: 0.5 });
    expect(anschlussZelle(4, 2, 'N')).toEqual({ x: 1.5, z: 0 });
    expect(anschlussZelle(4, 2, 'W')).toEqual({ x: 0, z: 0.5 });
  });
});
