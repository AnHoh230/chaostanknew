import { describe, it, expect } from 'vitest';
import { PARTS, getPart } from './parts';
import { SOCKETS } from '../tank/sockets';

describe('PARTS', () => {
  it('jedes Teil hat eine gültige Socket-Zuordnung + eine Variante', () => {
    for (const p of PARTS) {
      expect(SOCKETS).toContain(p.socket);
      expect(p.variantId).toBeTruthy();
    }
  });

  it('jedes Teil wirkt auf mindestens einen Stat (Schaden oder HP)', () => {
    for (const p of PARTS) {
      expect((p.damage ?? 0) + (p.maxHp ?? 0)).toBeGreaterThan(0);
    }
  });

  it('getPart wirft bei unbekannter id', () => {
    expect(() => getPart('plasmawerfer_9000')).toThrow(/Unbekanntes Teil/);
  });
});
