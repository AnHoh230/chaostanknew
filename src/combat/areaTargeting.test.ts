import { describe, it, expect } from 'vitest';
import { nearestInRange, idsWithinRadius, type AreaPt } from './areaTargeting';

const pts: AreaPt[] = [
  { id: 'a', x: 5, z: 0 },
  { id: 'b', x: 0, z: 12 },
  { id: 'c', x: 40, z: 40 },
];

describe('nearestInRange', () => {
  it('wählt den nächsten Punkt in Reichweite', () => {
    expect(nearestInRange(0, 0, pts, 50)?.id).toBe('a');
  });
  it('ignoriert Punkte außerhalb der Reichweite', () => {
    expect(nearestInRange(0, 0, pts, 6)?.id).toBe('a'); // nur a (Dist 5) in Reichweite
    expect(nearestInRange(0, 0, pts, 3)).toBeNull(); // keiner in Reichweite
  });
});

describe('idsWithinRadius', () => {
  it('liefert alle IDs im Radius', () => {
    expect(idsWithinRadius(0, 0, pts, 13).sort()).toEqual(['a', 'b']);
  });
  it('leer, wenn nichts im Radius', () => {
    expect(idsWithinRadius(0, 0, pts, 1)).toEqual([]);
  });
});
