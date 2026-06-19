import { describe, it, expect } from 'vitest';
import { createAkteBuch } from './akte';
import { generateNamed } from './promotion';

describe('createAkteBuch', () => {
  it('zählt Begegnungen und merkt sich den knappsten Sieg', () => {
    const buch = createAkteBuch();
    buch.record('e1', { ausgang: 'sieg', playerHpFrac: 0.5 });
    const a = buch.record('e1', { ausgang: 'sieg', playerHpFrac: 0.1 });
    expect(a.begegnungen).toBe(2);
    expect(a.siege).toBe(2);
    expect(a.knappsterSieg).toBeCloseTo(0.1, 6);
  });

  it('Niederlagen zählen separat, ändern den knappsten Sieg nicht', () => {
    const buch = createAkteBuch();
    buch.record('e1', { ausgang: 'sieg', playerHpFrac: 0.3 });
    const a = buch.record('e1', { ausgang: 'niederlage', playerHpFrac: 0 });
    expect(a.niederlagen).toBe(1);
    expect(a.knappsterSieg).toBeCloseTo(0.3, 6);
  });

  it('promote hängt einen Named an, archive markiert die Akte', () => {
    const buch = createAkteBuch();
    buch.record('e1', { ausgang: 'sieg', playerHpFrac: 0.1 });
    const named = generateNamed('knapper_sieg', () => 0.5);
    buch.promote('e1', named);
    expect(buch.get('e1')?.named?.archetyp).toBe('der Rasende');
    buch.archive('e1');
    expect(buch.get('e1')?.archiviert).toBe(true);
  });
});
