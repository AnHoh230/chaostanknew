import { describe, it, expect } from 'vitest';
import { maskeFuer, tileFuer, type RoadKind } from './roadTopology';

const M = (...dirs: number[]): number => dirs.reduce((m, d) => m | (1 << d), 0);
// Welt-konforme Anschlüsse eines Tiles nach Rotation r (CW): d -> (d+r)%4.
function anschluesse(kind: RoadKind, rot: number): number {
  const BASIS: Record<RoadKind, number[]> = {
    gerade: [0, 2], kurve: [0, 1], t: [1, 2, 3], kreuz: [0, 1, 2, 3], ende: [2],
  };
  return BASIS[kind].reduce((m, d) => m | (1 << ((d + rot) % 4)), 0);
}

describe('maskeFuer', () => {
  it('liest die 4 Nachbarn korrekt (N=row+1, O=col+1, S=row-1, W=col-1)', () => {
    const z = new Set(['0,1', '1,0', '0,-1', '-1,0']);
    expect(maskeFuer(z, 0, 0)).toBe(M(0, 1, 2, 3));
    expect(maskeFuer(new Set(['0,1']), 0, 0)).toBe(M(0)); // nur N
    expect(maskeFuer(new Set(['1,0']), 0, 0)).toBe(M(1)); // nur O
    expect(maskeFuer(new Set<string>(), 0, 0)).toBe(0);
  });
});

describe('tileFuer', () => {
  it('2 gegenüberliegende Nachbarn -> gerade', () => {
    expect(tileFuer(M(0, 2)).kind).toBe('gerade'); // N-S
    expect(tileFuer(M(1, 3)).kind).toBe('gerade'); // O-W
  });

  it('2 benachbarte -> kurve', () => {
    for (const m of [M(0, 1), M(1, 2), M(2, 3), M(3, 0)]) expect(tileFuer(m).kind).toBe('kurve');
  });

  it('3 -> T, 4 -> Kreuz, 1 -> Ende', () => {
    expect(tileFuer(M(0, 1, 2)).kind).toBe('t');
    expect(tileFuer(M(0, 1, 2, 3)).kind).toBe('kreuz');
    expect(tileFuer(M(0)).kind).toBe('ende');
  });

  it('die gewählte Rotation erzeugt EXAKT die Eingabe-Maske (alle Orientierungen)', () => {
    // jede mögliche nicht-leere Maske: das gewählte Tile muss nach Rotation die Maske treffen.
    for (let maske = 1; maske < 16; maske++) {
      const { kind, rot } = tileFuer(maske);
      expect(anschluesse(kind, rot), `maske ${maske} -> ${kind}@${rot}`).toBe(maske);
    }
  });

  it('isolierte Zelle (Maske 0) stürzt nicht ab', () => {
    expect(() => tileFuer(0)).not.toThrow();
    expect(tileFuer(0).rot).toBe(0);
  });
});
