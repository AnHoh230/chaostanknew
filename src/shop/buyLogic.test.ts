import { describe, it, expect } from 'vitest';
import { evaluateBuy, sellValue } from './buyLogic';
import { catalogItem } from './catalog';

const none = () => false;

describe('evaluateBuy', () => {
  it('normales Item, MK frei, genug Geld → ok', () => {
    expect(evaluateBuy(9999, catalogItem('waffe_mk02_normal'), 3, none)).toEqual({ ok: true });
  });

  it('seltene Items sind nicht kaufbar', () => {
    expect(evaluateBuy(9999, catalogItem('waffe_mk01_selten'), 10, none).ok).toBe(false);
    expect(evaluateBuy(9999, catalogItem('waffe_mk01_selten'), 10, none)).toEqual({ ok: false, grund: 'nur_normal' });
  });

  it('MK nicht freigeschaltet → gesperrt', () => {
    expect(evaluateBuy(9999, catalogItem('waffe_mk05_normal'), 2, none)).toEqual({ ok: false, grund: 'mk_gesperrt' });
  });

  it('schon verbaut → besessen', () => {
    const eq = (id: string) => id === 'waffe_mk02_normal';
    expect(evaluateBuy(9999, catalogItem('waffe_mk02_normal'), 5, eq)).toEqual({ ok: false, grund: 'besessen' });
  });

  it('zu wenig Geld → zu_teuer', () => {
    expect(evaluateBuy(10, catalogItem('waffe_mk02_normal'), 5, none)).toEqual({ ok: false, grund: 'zu_teuer' });
  });
});

describe('sellValue', () => {
  it('ist die Hälfte des Preises (gerundet)', () => {
    const it = catalogItem('waffe_mk02_normal'); // cost 340
    expect(sellValue(it)).toBe(170);
  });
});
