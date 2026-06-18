export interface Clock {
  simSpeed: number; // 0..1, default 1
  tick(engineDeltaMs: number): number; // simDt in SEKUNDEN
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function createClock(): Clock {
  return {
    simSpeed: 1,
    tick(engineDeltaMs: number): number {
      return (engineDeltaMs / 1000) * clamp01(this.simSpeed);
    },
  };
}
