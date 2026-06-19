import { describe, it, expect } from 'vitest';
import { TANK_CLASSES, getClass } from './classes';
import { SOCKETS } from '../tank/sockets';

describe('TANK_CLASSES', () => {
  it('drei Klassen mit eindeutigen ids', () => {
    expect(TANK_CLASSES).toHaveLength(3);
    const ids = new Set(TANK_CLASSES.map((c) => c.id));
    expect(ids.size).toBe(3);
  });

  it('jede Klasse hat alle vier Sockets belegt', () => {
    for (const c of TANK_CLASSES) {
      for (const s of SOCKETS) {
        expect(c.composition[s]).toBeTruthy();
      }
    }
  });

  it('Stat-Profil unterscheidet sich klar (Späher schnell, Haubitze zäh)', () => {
    const sp = getClass('spaeher');
    const ha = getClass('haubitze');
    expect(sp.speed).toBeGreaterThan(ha.speed);
    expect(ha.maxHp).toBeGreaterThan(sp.maxHp);
    expect(ha.damage).toBeGreaterThan(sp.damage);
  });
});

describe('getClass', () => {
  it('unbekannte Klasse wirft laut', () => {
    expect(() => getClass('panzerkampfwagen')).toThrow(/Unbekannte Klasse/);
  });
});
