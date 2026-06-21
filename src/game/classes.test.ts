import { describe, it, expect } from 'vitest';
import { TANK_CLASSES, getClass } from './classes';
import { SOCKETS } from '../tank/sockets';

describe('TANK_CLASSES', () => {
  it('genau eine Klasse (Multiklasse entfernt)', () => {
    expect(TANK_CLASSES).toHaveLength(1);
    expect(TANK_CLASSES[0]!.id).toBe('haubitze');
  });

  it('die Klasse hat alle vier Sockets belegt', () => {
    for (const c of TANK_CLASSES) {
      for (const s of SOCKETS) {
        expect(c.composition[s]).toBeTruthy();
      }
    }
  });

  it('Grundwerte plausibel (zäh + harter Schlag)', () => {
    const ha = getClass('haubitze');
    expect(ha.maxHp).toBeGreaterThan(100);
    expect(ha.damage).toBeGreaterThan(20);
  });
});

describe('getClass', () => {
  it('unbekannte Klasse wirft laut', () => {
    expect(() => getClass('panzerkampfwagen')).toThrow(/Unbekannte Klasse/);
  });
});
