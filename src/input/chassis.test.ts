import { describe, it, expect } from 'vitest';
import { stepChassis, chassisForward, type ChassisConfig } from './chassis';

const cfg: ChassisConfig = {
  maxForward: 10, maxReverse: 4.5,
  accel: 24, reverseAccel: 15, brake: 40, friction: 16,
  deadzone: 0.4,
  turnStanding: 2.6, turnSlow: 1.9, turnFast: 0.9,
  reverseTurnMod: 0.6, brakeTurnMod: 0.45,
  slowSpeed: 3.5, fastSpeed: 7,
};

describe('stepChassis', () => {
  it('W beschleunigt vorwärts aus dem Stand', () => {
    const s = stepChassis({ heading: 0, velocity: 0 }, { throttle: 1, steer: 0 }, cfg, 0.1);
    expect(s.velocity).toBeCloseTo(2.4, 5); // accel*dt
  });

  it('Geschwindigkeit wird auf maxForward begrenzt', () => {
    const s = stepChassis({ heading: 0, velocity: 9.9 }, { throttle: 1, steer: 0 }, cfg, 1);
    expect(s.velocity).toBe(10);
  });

  it('S bei Vorwärtsfahrt bremst zuerst (kein Sofort-Flip)', () => {
    const s = stepChassis({ heading: 0, velocity: 8 }, { throttle: -1, steer: 0 }, cfg, 0.1);
    expect(s.velocity).toBeLessThan(8);
    expect(s.velocity).toBeGreaterThan(0); // noch vorwärts, nur langsamer
  });

  it('ohne Gas rollt der Panzer aus (Reibung Richtung 0)', () => {
    const s = stepChassis({ heading: 0, velocity: 5 }, { throttle: 0, steer: 0 }, cfg, 0.1);
    expect(s.velocity).toBeCloseTo(5 - 1.6, 5);
  });

  it('A/D drehen das Heading; im Stand stärker als schnell', () => {
    const stand = stepChassis({ heading: 0, velocity: 0 }, { throttle: 0, steer: 1 }, cfg, 0.1);
    const fast = stepChassis({ heading: 0, velocity: 9 }, { throttle: 0, steer: 1 }, cfg, 0.1);
    expect(stand.heading).toBeCloseTo(0.26, 5); // turnStanding*dt
    expect(fast.heading).toBeCloseTo(0.09, 5); // turnFast*dt
    expect(stand.heading).toBeGreaterThan(fast.heading);
  });

  it('chassisForward: heading 0 = +Z, heading +90° = +X', () => {
    expect(chassisForward(0).z).toBeCloseTo(1, 5);
    expect(chassisForward(Math.PI / 2).x).toBeCloseTo(1, 5);
  });
});
