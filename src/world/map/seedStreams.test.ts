import { describe, expect, it } from 'vitest';
import { createSeedStream, seedForStream } from './seedStreams';

describe('seedStreams', () => {
  it('haelt gelabelte Seeds stabil und voneinander getrennt', () => {
    expect(seedForStream(927361, 'fields')).toBe(seedForStream(927361, 'fields'));
    expect(seedForStream(927361, 'fields')).not.toBe(seedForStream(927361, 'sites'));
  });

  it('erzeugt fuer denselben Weltseed und dasselbe Label dieselbe Folge', () => {
    const a = createSeedStream(42, 'routing');
    const b = createSeedStream(42, 'routing');
    expect([a.next(), a.next(), a.int(100)]).toEqual([b.next(), b.next(), b.int(100)]);
  });
});
