import { describe, it, expect } from 'vitest';
import { createPhasenState, verhaerte } from './phasen';

describe('phasen — Häutungs-Zustand (B, Spec 0 §4/§6)', () => {
  it('startet komplett unverhärtet', () => {
    const s = createPhasenState();
    expect(s.verhaertet).toEqual({ build: false, ult: false, finisher: false });
  });

  it('verhaerte meldet die ERSTE Verhärtung (für einmaligen Toast), danach false', () => {
    const s = createPhasenState();
    expect(verhaerte(s, 'build')).toBe(true);
    expect(s.verhaertet.build).toBe(true);
    expect(verhaerte(s, 'build')).toBe(false); // schon verhärtet
    expect(verhaerte(s, 'ult')).toBe(true); // andere Schicht unabhängig
  });
});
