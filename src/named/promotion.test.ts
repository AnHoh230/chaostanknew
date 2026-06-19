import { describe, it, expect } from 'vitest';
import { istKnapperSieg, generateNamed, KNAPP_SCHWELLE } from './promotion';
import { createRng } from '../core/rng';

describe('istKnapperSieg', () => {
  it('genau an der Schwelle (15 %) = knapp', () => {
    expect(istKnapperSieg(KNAPP_SCHWELLE)).toBe(true);
  });
  it('knapp darüber = nicht knapp', () => {
    expect(istKnapperSieg(0.1501)).toBe(false);
  });
  it('deutlich darunter = knapp', () => {
    expect(istKnapperSieg(0.05)).toBe(true);
  });
});

describe('generateNamed', () => {
  it('Name = "Vorname der ‹Motiv›", Origin liefert Perks (Lebensschub, flieht nie)', () => {
    const named = generateNamed('knapper_sieg', 'Aasgeier', () => 0.5);
    expect(named.archetyp).toBe('der Rasende');
    expect(named.name.endsWith(' der Aasgeier')).toBe(true);
    expect(named.name.split(' ')[0]!.length).toBeGreaterThan(0); // hat einen Vornamen
    expect(named.traitOverlay.vorsicht).toBe(0);
    expect(named.perks).toContain('lebensschub_vor_tod');
    expect(named.signaturTeil.length).toBeGreaterThan(0);
  });

  it('ist seed-deterministisch (gleicher Seed → gleicher Name)', () => {
    const a = generateNamed('knapper_sieg', 'Schatzjäger', createRng(99).next);
    const b = generateNamed('knapper_sieg', 'Schatzjäger', createRng(99).next);
    expect(a.name).toBe(b.name);
  });

  it('unbekannter Origin wirft laut', () => {
    expect(() => generateNamed('irgendwas', 'Aasgeier', () => 0.5)).toThrow(/Unbekannter Origin/);
  });
});
