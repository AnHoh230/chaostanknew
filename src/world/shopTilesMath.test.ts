import { describe, it, expect } from 'vitest';
import { onAnyTile, nearestTile } from './shopTilesMath';

const TILES = [
  { x: 40, z: 0 },
  { x: -40, z: 0 },
  { x: 0, z: 40 },
];

describe('onAnyTile', () => {
  it('genau im Reichweiten-Radius eines Felds = true', () => {
    expect(onAnyTile(TILES, 43, 0, 5)).toBe(true); // 3 weg von (40,0)
  });
  it('außerhalb aller Felder = false', () => {
    expect(onAnyTile(TILES, 10, 10, 5)).toBe(false);
  });
  it('genau am Rand (dist == reach) zählt noch als drauf', () => {
    expect(onAnyTile(TILES, 45, 0, 5)).toBe(true);
  });
});

describe('nearestTile', () => {
  it('liefert das nächstgelegene Feld mit Distanz', () => {
    const n = nearestTile(TILES, 5, 30); // eindeutig am nächsten zu (0,40)
    expect(n).not.toBeNull();
    expect(n!.x).toBe(0);
    expect(n!.z).toBe(40);
    expect(n!.dist).toBeCloseTo(Math.hypot(5, 10), 6);
  });
  it('keine Felder → null', () => {
    expect(nearestTile([], 0, 0)).toBeNull();
  });
});
