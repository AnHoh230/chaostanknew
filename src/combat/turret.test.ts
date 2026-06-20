import { describe, it, expect } from 'vitest';
import { stepTurret } from './turret';

describe('stepTurret', () => {
  it('unendliche Slew-Rate → sofort am Ziel', () => {
    expect(stepTurret(0, 1.2, Infinity, 0.016)).toBe(1.2);
  });

  it('begrenzt die Drehung auf slewRate*dt', () => {
    expect(stepTurret(0, 1, 0.5, 1)).toBeCloseTo(0.5, 6);
  });

  it('innerhalb eines Schritts → genau Ziel', () => {
    expect(stepTurret(0, 0.3, 0.5, 1)).toBeCloseTo(0.3, 6);
  });

  it('nimmt den kürzeren Weg über die ±π-Grenze', () => {
    // von 3.0 nach -3.0 ist der kurze Weg +0.283 (über π), nicht -6
    expect(stepTurret(3.0, -3.0, 0.1, 1)).toBeCloseTo(3.1, 6);
  });

  it('kurzer Weg landet innerhalb eines Schritts am Ziel', () => {
    expect(stepTurret(3.0, -3.0, 0.5, 1)).toBe(-3.0);
  });
});
