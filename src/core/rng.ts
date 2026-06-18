export interface Rng {
  next(): number; // 0..1
  int(maxExcl: number): number;
  range(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int(maxExcl: number): number {
      return Math.floor(next() * maxExcl);
    },
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
  };
}
