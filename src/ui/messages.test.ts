import { describe, it, expect } from 'vitest';
import { durationFor } from './messages';

// Reine Logik der „zu schnell weg"-Behebung: Dauer steigt mit Textlänge, geclampt,
// und Lern-Banner stehen grundsätzlich länger als flüchtiges Feedback.
describe('durationFor — längen-gekoppelte Anzeigedauer', () => {
  it('feedback ist auf [2.2 .. 4.5] s geclampt', () => {
    expect(durationFor(0, 'feedback')).toBe(2.2); // kürzeste Quittung blitzt nicht unter 2.2s
    expect(durationFor(200, 'feedback')).toBe(4.5); // langer Text deckelt bei 4.5s
  });

  it('teach ist auf [4.5 .. 8.5] s geclampt und damit länger als feedback', () => {
    expect(durationFor(0, 'teach')).toBe(4.5);
    expect(durationFor(500, 'teach')).toBe(8.5);
    expect(durationFor(40, 'teach')).toBeGreaterThan(durationFor(40, 'feedback'));
  });

  it('wächst monoton mit der Länge (vor dem Clamp)', () => {
    expect(durationFor(20, 'feedback')).toBeGreaterThan(durationFor(5, 'feedback'));
    expect(durationFor(60, 'teach')).toBeGreaterThan(durationFor(20, 'teach'));
  });
});
