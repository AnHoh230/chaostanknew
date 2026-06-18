import { describe, it, expect } from 'vitest';
import { yawTo, rayGroundY0 } from './aimMath';

describe('yawTo', () => {
  it('yaw 0, wenn Ziel direkt in +Z liegt', () => {
    expect(yawTo(0, 0, 0, 5)).toBeCloseTo(0, 6);
  });

  it('yaw +90deg, wenn Ziel in +X liegt', () => {
    expect(yawTo(0, 0, 5, 0)).toBeCloseTo(Math.PI / 2, 6);
  });

  it('yaw 180deg, wenn Ziel hinten (-Z) liegt', () => {
    expect(Math.abs(yawTo(0, 0, 0, -5))).toBeCloseTo(Math.PI, 6);
  });

  it('ist translationsinvariant (gleicher relativer Vektor -> gleicher yaw)', () => {
    expect(yawTo(10, 20, 13, 24)).toBeCloseTo(yawTo(0, 0, 3, 4), 6);
  });
});

describe('rayGroundY0', () => {
  it('trifft die Ebene direkt unter einem nach unten gerichteten Strahl', () => {
    const p = rayGroundY0(0, 10, 0, 0, -1, 0);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(0, 6);
    expect(p!.z).toBeCloseTo(0, 6);
  });

  it('projiziert einen 45deg-Strahl korrekt nach vorne', () => {
    const p = rayGroundY0(0, 10, 0, 1, -1, 0);
    expect(p!.x).toBeCloseTo(10, 6);
    expect(p!.z).toBeCloseTo(0, 6);
  });

  it('liefert null bei zur Ebene parallelem Strahl', () => {
    expect(rayGroundY0(0, 10, 0, 1, 0, 0)).toBeNull();
  });

  it('liefert null, wenn der Strahl nach oben zeigt (kein Boden)', () => {
    expect(rayGroundY0(0, 10, 0, 0, 1, 0)).toBeNull();
  });
});
