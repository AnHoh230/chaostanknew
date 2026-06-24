import { describe, it, expect } from 'vitest';
import {
  createBefehlState, markiere, markVoll, aktuellesZiel, trefferArt, bruch,
  registriereKill, verstaerkung, tickCombo, MAX_MARKS, COMBO_TIME, SIMULTAN_SCHWELLE,
} from './befehl';

describe('markieren', () => {
  it('vergibt Order 1..3 in Markier-Reihenfolge, max 3', () => {
    const s = createBefehlState();
    expect(markiere(s, 'a')).toBe(true);
    expect(markiere(s, 'b')).toBe(true);
    expect(markiere(s, 'c')).toBe(true);
    expect(markVoll(s)).toBe(true);
    expect(markiere(s, 'd')).toBe(false); // voll
    expect(s.marks.map((m) => m.order)).toEqual([1, 2, 3]);
  });

  it('markiert dasselbe Ziel nicht doppelt', () => {
    const s = createBefehlState();
    markiere(s, 'a');
    expect(markiere(s, 'a')).toBe(false);
    expect(s.marks).toHaveLength(1);
  });

  it('aktuelles Ziel ist Order == nextOrder (Start: 1)', () => {
    const s = createBefehlState();
    markiere(s, 'a'); markiere(s, 'b');
    expect(aktuellesZiel(s)?.id).toBe('a');
  });
});

describe('trefferArt — Reihenfolge', () => {
  const setup = () => { const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c'); return s; };

  it('aktuelles Ziel = "aktuell" (mehrfaches Schießen bleibt aktuell)', () => {
    const s = setup();
    expect(trefferArt(s, 'a')).toBe('aktuell');
    expect(trefferArt(s, 'a')).toBe('aktuell'); // erneut auf 1 → ok
  });

  it('höheres markiertes Ziel = "vorgriff" (2 vor 1, 3 vor 2)', () => {
    const s = setup();
    expect(trefferArt(s, 'b')).toBe('vorgriff');
    expect(trefferArt(s, 'c')).toBe('vorgriff');
  });

  it('unmarkiertes Ziel = "fremd"', () => {
    const s = setup();
    expect(trefferArt(s, 'x')).toBe('fremd');
  });
});

describe('registriereKill — Kaskade & Reihe', () => {
  it('korrekter Kill hebt Kette, rückt Zeiger, refresht Combo', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    const r = registriereKill(s, 'a');
    expect(s.kette).toBe(1);
    expect(s.combo).toBe(COMBO_TIME);
    expect(s.nextOrder).toBe(2);
    expect(aktuellesZiel(s)?.id).toBe('b');
    expect(r.reiheKomplett).toBe(false);
  });

  it('volle 3er-Reihe meldet reiheKomplett und setzt zurück (neue Ziele in main)', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a'); registriereKill(s, 'b');
    const r = registriereKill(s, 'c');
    expect(r.reiheKomplett).toBe(true);
    expect(s.kette).toBe(3);
    expect(s.nextOrder).toBe(1);
    expect(s.marks).toHaveLength(0);
  });
});

describe('Bruch bei Vorgriff', () => {
  it('verfallen lässt Ziele und nullt Kaskade + Combo', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a'); // kette 1, nextOrder 2
    // Spieler greift vor (trifft 'c' statt 'b') → main ruft bruch()
    expect(trefferArt(s, 'c')).toBe('vorgriff');
    bruch(s);
    expect(s.kette).toBe(0);
    expect(s.marks).toHaveLength(0);
    expect(s.nextOrder).toBe(1);
  });
});

describe('Verstärkung (BBB) & Simultan-Schuss', () => {
  // Hilfsweg: zwei volle Reihen abarbeiten (6 Kills) — zwischen den Reihen neu markieren.
  const killSequenz = (s: ReturnType<typeof createBefehlState>, n: number): void => {
    let seq = 0;
    while (seq < n) {
      if (s.marks.length === 0) { markiere(s, `${seq}a`); markiere(s, `${seq}b`); markiere(s, `${seq}c`); }
      const cur = aktuellesZiel(s)!;
      registriereKill(s, cur.id);
      seq++;
    }
  };

  it('erste volle Reihe (3 Kills) = Stufe 1, danach +1 je Kill', () => {
    const s = createBefehlState();
    killSequenz(s, 3);
    expect(verstaerkung(s)).toBe(1);
    killSequenz(s, 1); // 4. Kill
    expect(verstaerkung(s)).toBe(2);
  });

  it('ab 6 in-Reihe-Kills ist der Simultan-Schuss bereit', () => {
    const s = createBefehlState();
    killSequenz(s, 5);
    expect(s.kette).toBe(5);
    const r = registriereKill(s, aktuellesZiel(s) ? aktuellesZiel(s)!.id : 'none');
    // 6. Kill kann eine neue Reihe brauchen — sauber über die Sequenz prüfen:
    void r;
    const s2 = createBefehlState();
    killSequenz(s2, 6);
    expect(s2.kette).toBe(6);
    expect(s2.kette >= SIMULTAN_SCHWELLE).toBe(true);
  });
});

describe('Combo-Timer', () => {
  it('läuft bei aktiver Kette ab → Bruch', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a'); // combo = 10, kette = 1
    tickCombo(s, COMBO_TIME + 0.1);
    expect(s.kette).toBe(0);
    expect(s.marks).toHaveLength(0);
  });

  it('tickt nicht ohne aktive Kette', () => {
    const s = createBefehlState();
    s.combo = 5; // künstlich, aber kette 0
    tickCombo(s, 1);
    expect(s.combo).toBe(5); // unverändert
  });

  it('jeder Kill refresht den Timer auf 10 s', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a');
    tickCombo(s, 6); // combo 4
    registriereKill(s, 'b'); // refresh
    expect(s.combo).toBe(COMBO_TIME);
  });
});

describe('MAX_MARKS-Konstante', () => {
  it('ist 3 (drei Ziele)', () => { expect(MAX_MARKS).toBe(3); });
});
