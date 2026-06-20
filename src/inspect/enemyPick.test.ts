import { describe, it, expect } from 'vitest';
import { nearestToPointer } from './enemyPick';

const blips = [
  { id: 'a', sx: 100, sy: 100 },
  { id: 'b', sx: 300, sy: 300 },
];

describe('nearestToPointer', () => {
  it('nimmt den nächsten Gegner innerhalb maxPx', () => {
    expect(nearestToPointer(110, 105, blips, 70)).toBe('a');
  });

  it('nichts in Reichweite → null', () => {
    expect(nearestToPointer(500, 500, blips, 70)).toBeNull();
  });

  it('leere Liste → null', () => {
    expect(nearestToPointer(0, 0, [], 70)).toBeNull();
  });

  it('genau am Rand (dist == maxPx) zählt noch', () => {
    expect(nearestToPointer(170, 100, blips, 70)).toBe('a'); // 70 px rechts von a
  });

  it('Gleichstand → erster in der Liste', () => {
    const tie = [
      { id: 'a', sx: 150, sy: 200 },
      { id: 'b', sx: 250, sy: 200 },
    ];
    expect(nearestToPointer(200, 200, tie, 70)).toBe('a');
  });
});
