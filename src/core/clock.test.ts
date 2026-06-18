import { describe, it, expect } from 'vitest';
import { createClock } from './clock';

describe('createClock', () => {
  it('simSpeed default ist 1', () => {
    const c = createClock();
    expect(c.simSpeed).toBe(1);
  });

  it('tick liefert simDt in SEKUNDEN bei simSpeed=1', () => {
    const c = createClock();
    expect(c.tick(1000)).toBeCloseTo(1, 10);
    expect(c.tick(500)).toBeCloseTo(0.5, 10);
  });

  it('skaliert dt mit simSpeed', () => {
    const c = createClock();
    c.simSpeed = 0.5;
    expect(c.tick(1000)).toBeCloseTo(0.5, 10);
  });

  it('simSpeed=0 friert die Zeit ein', () => {
    const c = createClock();
    c.simSpeed = 0;
    expect(c.tick(1000)).toBe(0);
  });

  it('clampt simSpeed > 1 auf 1', () => {
    const c = createClock();
    c.simSpeed = 5;
    expect(c.tick(1000)).toBeCloseTo(1, 10);
  });

  it('clampt negative simSpeed auf 0', () => {
    const c = createClock();
    c.simSpeed = -3;
    expect(c.tick(1000)).toBe(0);
  });
});
