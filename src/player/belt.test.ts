import { describe, it, expect } from 'vitest';
import { createBelt } from './belt';

const a = { id: 'a' };
const b = { id: 'b' };
const c = { id: 'c' };
const d = { id: 'd' };

describe('createBelt', () => {
  it('startet leer mit fester Größe', () => {
    const belt = createBelt<typeof a>(3);
    expect(belt.slots()).toEqual([null, null, null]);
    expect(belt.count()).toBe(0);
  });

  it('add füllt den nächsten freien Slot, voll → false', () => {
    const belt = createBelt<typeof a>(3);
    expect(belt.add(a)).toBe(true);
    expect(belt.add(b)).toBe(true);
    expect(belt.add(c)).toBe(true);
    expect(belt.add(d)).toBe(false); // voll
    expect(belt.slots()).toEqual([a, b, c]);
    expect(belt.count()).toBe(3);
  });

  it('trigger gibt die Ladung zurück und leert den Slot', () => {
    const belt = createBelt<typeof a>(3);
    belt.add(a);
    belt.add(b);
    expect(belt.trigger(0)).toBe(a);
    expect(belt.slots()).toEqual([null, b, null]);
    expect(belt.trigger(0)).toBeNull(); // schon leer
    expect(belt.count()).toBe(1);
  });

  it('trigger außerhalb des Bereichs → null', () => {
    const belt = createBelt<typeof a>(3);
    expect(belt.trigger(9)).toBeNull();
    expect(belt.trigger(-1)).toBeNull();
  });
});
