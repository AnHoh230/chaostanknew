import { describe, it, expect } from 'vitest';
import { balanceTabelle, balanceZeile, MESS_ENDE } from './balanceModell';

describe('Balance-Taschenrechner (auf Basis echter Run-Messpunkte)', () => {
  it('gibt die Progressions-Tabelle aus (Spieler-Schaden vs. Gegner-HP über die Zeit)', () => {
    const tab = balanceTabelle();
    const rows = tab.map((r) => ({
      'Min': r.min,
      'Extrap?': r.extrapoliert ? 'ja' : '',
      'Geg-Stufe': r.gegnerStufe,
      'HP Allr': r.hpAllrounder,
      'kpm': r.kpm,
      'Kills': r.kills,
      'Kmd Schuss': r.schussSchaden,
      'Schüsse/Kill': r.schuesseBisKill,
      'Overkill×': r.overkillFaktor,
      'Gift reif/Tick': r.giftReifProTick,
      'Gift-Ticks/Kill': r.giftTicksBisKill,
      'Skillpkt': r.skillpunkte,
    }));
    // eslint-disable-next-line no-console
    console.log(`\nBalance-Taschenrechner — Messpunkte bis ${MESS_ENDE}s, danach extrapoliert`);
    // eslint-disable-next-line no-console
    console.table(rows);
    expect(tab.length).toBe(9);
  });

  it('Sanity: Gegner-HP, Kommander-Schaden und Gift-Schaden steigen monoton', () => {
    const tab = balanceTabelle([1, 5, 10, 20, 30]);
    for (let i = 1; i < tab.length; i++) {
      expect(tab[i]!.hpAllrounder).toBeGreaterThanOrEqual(tab[i - 1]!.hpAllrounder);
      expect(tab[i]!.schussSchaden).toBeGreaterThan(tab[i - 1]!.schussSchaden);
      expect(tab[i]!.giftReifProTick).toBeGreaterThan(tab[i - 1]!.giftReifProTick);
    }
  });

  it('liest die Messpunkte korrekt (1 Minute = Messpunkt t=60s)', () => {
    const z = balanceZeile(1);
    expect(z.kpm).toBe(8.6); // exakter Messpunkt (run-121)
    expect(z.schussSchaden).toBe(90); // gemessener Schaden/Schuss
    expect(z.extrapoliert).toBe(false);
  });

  it('markiert Hochrechnung jenseits der Messpunkte als extrapoliert', () => {
    expect(balanceZeile(6).extrapoliert).toBe(false); // 360s < MESS_ENDE (660s)
    expect(balanceZeile(12).extrapoliert).toBe(true); // 720s > MESS_ENDE
  });
});
