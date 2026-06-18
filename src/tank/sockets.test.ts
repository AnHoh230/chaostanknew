import { describe, it, expect } from 'vitest';
import { SOCKETS } from './sockets';
import type { SocketName, TankComposition } from './sockets';

describe('sockets', () => {
  it('SOCKETS enthält genau die 4 Socket-Namen in Reihenfolge', () => {
    expect(SOCKETS).toEqual(['chassis', 'wheels', 'turret', 'weapon']);
  });

  it('SOCKETS hat Länge 4 und keine Duplikate', () => {
    expect(SOCKETS).toHaveLength(4);
    expect(new Set(SOCKETS).size).toBe(4);
  });

  it('jeder SOCKET-Eintrag ist ein gültiger SocketName', () => {
    const allowed: SocketName[] = ['chassis', 'wheels', 'turret', 'weapon'];
    for (const s of SOCKETS) {
      expect(allowed).toContain(s);
    }
  });

  it('TankComposition akzeptiert je Socket eine Varianten-ID', () => {
    const comp: TankComposition = {
      chassis: 'c_box',
      wheels: 'w_round',
      turret: 't_small',
      weapon: 'g_short',
    };
    expect(comp.chassis).toBe('c_box');
    expect(comp.weapon).toBe('g_short');
  });
});
