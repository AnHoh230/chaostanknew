import { describe, it, expect } from 'vitest';
import { circleOverlap } from './hitMath';

describe('circleOverlap', () => {
  it('überlappt, wenn die Mittelpunkte näher als die Radiensumme liegen', () => {
    expect(circleOverlap(0, 0, 0.3, 1, 0, 1)).toBe(true);
  });

  it('überlappt NICHT, wenn der Abstand größer als die Radiensumme ist', () => {
    expect(circleOverlap(0, 0, 0.3, 5, 0, 1)).toBe(false);
  });

  it('berührt genau an der Grenze = Treffer (<=)', () => {
    // Abstand 1.3 = ar(0.3)+br(1.0)
    expect(circleOverlap(0, 0, 0.3, 1.3, 0, 1)).toBe(true);
  });
});
