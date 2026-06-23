import { describe, it, expect } from 'vitest';
import { computeUiScale, UI_SCALE_MIN, UI_SCALE_MAX, UI_BASELINE_H } from './uiScale';

describe('computeUiScale', () => {
  it('ist 1.0 bei der Basislinie (1080p) — Standard-Auflösungen unverändert', () => {
    expect(computeUiScale(UI_BASELINE_H)).toBe(1);
  });

  it('skaliert große Displays hoch (1440p, 4K)', () => {
    expect(computeUiScale(1440)).toBeCloseTo(1440 / 1080, 5); // ~1.33
    expect(computeUiScale(2160)).toBeCloseTo(2.0, 5); // 4K → 2.0 (unter dem 2.2-Clamp)
  });

  it('skaliert nie unter 1.0 (kleine Displays bleiben wie bisher)', () => {
    expect(computeUiScale(768)).toBe(UI_SCALE_MIN);
    expect(computeUiScale(600)).toBe(UI_SCALE_MIN);
  });

  it('clampt nach oben gegen Extreme', () => {
    expect(computeUiScale(10000)).toBe(UI_SCALE_MAX);
  });

  it('ist robust gegen kaputte Werte', () => {
    expect(computeUiScale(0)).toBe(UI_SCALE_MIN);
    expect(computeUiScale(NaN)).toBe(UI_SCALE_MIN);
    expect(computeUiScale(-100)).toBe(UI_SCALE_MIN);
  });
});
