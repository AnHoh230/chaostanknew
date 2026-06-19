import { describe, it, expect } from 'vitest';
import { evaluateBuy } from './buyLogic';
import { getPart } from '../loot/parts';

const teil = getPart('lange_kanone'); // cost 120

describe('evaluateBuy', () => {
  it('genug Geld, nicht besessen → ok', () => {
    expect(evaluateBuy(200, teil, new Set())).toEqual({ ok: true });
  });

  it('zu wenig Geld → zu_teuer', () => {
    expect(evaluateBuy(50, teil, new Set())).toEqual({ ok: false, grund: 'zu_teuer' });
  });

  it('schon besessen → besessen (auch mit genug Geld)', () => {
    expect(evaluateBuy(999, teil, new Set(['lange_kanone']))).toEqual({ ok: false, grund: 'besessen' });
  });

  it('Preis exakt = Guthaben → ok', () => {
    expect(evaluateBuy(120, teil, new Set())).toEqual({ ok: true });
  });
});
