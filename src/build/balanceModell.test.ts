import { describe, it, expect } from 'vitest';
import { balanceTabelle, balanceZeile, ANNAHMEN } from './balanceModell';

describe('Balance-Taschenrechner', () => {
  it('gibt die Progressions-Tabelle aus (Spieler-Schaden vs. Gegner-HP über die Zeit)', () => {
    const tab = balanceTabelle();
    const rows = tab.map((r) => ({
      'Min': r.min,
      'Geg-Stufe': r.gegnerStufe,
      'HP Allr': r.hpAllrounder,
      'HP Bunk': r.hpBunker,
      'Kills': r.kills,
      'Build(Gift)': r.buildStufeGift,
      'Fieber': r.erntefieber,
      'Gift reif/Tick': r.giftReifProTick,
      'Gift-Ticks/Kill': r.giftTicksBisKill,
      'Kmd Schuss': r.schussMarkiert,
      'Kmd Schüsse/Kill': r.schuesseBisKill,
      'Skillpkt': r.skillpunkte,
    }));
    // eslint-disable-next-line no-console
    console.log(`\nBalance-Taschenrechner (Annahmen: ${ANNAHMEN.kpm} Kills/min, Grundschaden ${ANNAHMEN.grundschaden})`);
    // eslint-disable-next-line no-console
    console.table(rows);
    expect(tab.length).toBe(8);
  });

  it('Sanity: Gegner-HP, Gift- und Kommander-Schaden steigen monoton über die Zeit', () => {
    const tab = balanceTabelle([1, 5, 10, 20, 30]);
    for (let i = 1; i < tab.length; i++) {
      expect(tab[i]!.hpAllrounder).toBeGreaterThanOrEqual(tab[i - 1]!.hpAllrounder);
      expect(tab[i]!.giftReifProTick).toBeGreaterThan(tab[i - 1]!.giftReifProTick);
      expect(tab[i]!.schussMarkiert).toBeGreaterThan(tab[i - 1]!.schussMarkiert);
    }
  });

  it('rechnet eine bekannte Zeile nachvollziehbar (1 Minute)', () => {
    const z = balanceZeile(1);
    expect(z.kills).toBe(17); // 17 kpm × 1 min
    expect(z.erntefieber).toBe(17);
    expect(z.giftReifProTick).toBe(9 + 17 * 2); // reifDmg 9 + Fieber 17 × 2 = 43
    expect(z.schussMarkiert).toBeGreaterThan(36 * 2 * 1.6); // mind. Grund-markiert (115) + Aufbau
  });
});
