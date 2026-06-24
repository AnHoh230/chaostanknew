import { describe, it, expect } from 'vitest';
import {
  createBefehlState, markiere, markVoll, aktuellesZiel, trefferArt, bruch,
  registriereKill, aufbauStufe, schadenStufe, tickBefehl,
  MAX_MARKS, COMBO_TIME, BUFF_TIME, BB_CAP,
} from './befehl';

// Baut eine durchgehende Kette von n in-Reihe-Kills (markiert je 3 neu, wenn leer). bbb=true verhindert
// den BB-Cap-Reset, sodass die Kette grenzenlos hochzählt (für Aufbau-/BBB-Prüfungen).
const baueKette = (s: ReturnType<typeof createBefehlState>, n: number, bbb = true): void => {
  let seq = 0;
  while (seq < n) {
    if (s.marks.length === 0) { markiere(s, `${seq}a`); markiere(s, `${seq}b`); markiere(s, `${seq}c`); }
    const cur = aktuellesZiel(s);
    if (!cur) break;
    registriereKill(s, cur.id, bbb);
    seq++;
  }
};

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

describe('registriereKill — Reihe & Zeiger', () => {
  it('korrekter Kill hebt Kette, rückt Zeiger, refresht Combo', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    const r = registriereKill(s, 'a', false);
    expect(s.kette).toBe(1);
    expect(s.combo).toBe(COMBO_TIME);
    expect(s.nextOrder).toBe(2);
    expect(aktuellesZiel(s)?.id).toBe('b');
    expect(r.reiheKomplett).toBe(false);
  });

  it('volle 3er-Reihe meldet reiheKomplett und setzt zurück (neue Ziele in main)', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a', false); registriereKill(s, 'b', false);
    const r = registriereKill(s, 'c', false);
    expect(r.reiheKomplett).toBe(true);
    expect(s.kette).toBe(3);
    expect(s.nextOrder).toBe(1);
    expect(s.marks).toHaveLength(0);
  });

  it('unvollständige Salve (nur 2 markiert) → NICHT komplett, aber Zeiger zurück auf 1', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b');
    expect(registriereKill(s, 'a', false).reiheKomplett).toBe(false);
    const r = registriereKill(s, 'b', false);
    expect(r.reiheKomplett).toBe(false); // nur 2 abgearbeitet = keine volle Reihe → kein Auto-Nachsetzen
    expect(s.marks).toHaveLength(0);
    expect(s.nextOrder).toBe(1); // nächste Salve beginnt wieder bei Order 1 (sonst Vorgriff-Brüche)
  });
});

describe('Aufbau-Stufe', () => {
  it('0 bis zur ersten vollen Reihe, dann +1 je weiterem in-Reihe-Kill', () => {
    const s = createBefehlState();
    baueKette(s, 3);
    expect(s.kette).toBe(3);
    expect(aufbauStufe(s)).toBe(0); // erste Reihe = noch kein Aufbau
    baueKette(s, 1); // 4. Kill
    expect(aufbauStufe(s)).toBe(1);
    baueKette(s, 2); // 5., 6. Kill
    expect(aufbauStufe(s)).toBe(3);
  });

  it('schadenStufe nimmt den größeren aus laufendem Aufbau und gehaltenem Buff', () => {
    const s = createBefehlState();
    s.buffStufe = 2; s.buffRest = 5; // gehaltener Buff B aktiv, keine Kette
    expect(schadenStufe(s)).toBe(2);
    baueKette(s, 6); // Aufbau 3
    expect(schadenStufe(s)).toBe(3);
  });

  it('ausgelaufener Buff (buffRest 0) zählt nicht mehr zur schadenStufe', () => {
    const s = createBefehlState();
    s.buffStufe = 3; s.buffRest = 0; // ausgelaufen
    expect(schadenStufe(s)).toBe(0);
  });
});

describe('BB — Cap & Buff B', () => {
  it('Aufbau erreicht BB_CAP → Buff B rastet ein, Kette abgeschlossen (capErreicht)', () => {
    const s = createBefehlState();
    markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c'); // Reihe 1
    registriereKill(s, 'a', false); registriereKill(s, 'b', false); registriereKill(s, 'c', false);
    markiere(s, 'd'); markiere(s, 'e'); markiere(s, 'f'); // Reihe 2 = Aufbau
    registriereKill(s, 'd', false); expect(aufbauStufe(s)).toBe(1);
    registriereKill(s, 'e', false); expect(aufbauStufe(s)).toBe(2);
    const r = registriereKill(s, 'f', false); // +3 = Cap
    expect(r.capErreicht).toBe(true);
    expect(s.buffStufe).toBe(BB_CAP);
    expect(s.buffRest).toBe(BUFF_TIME);
    expect(s.kette).toBe(0); // Kette abgeschlossen → Auto-Stop in main
    expect(s.marks).toHaveLength(0);
  });

  it('Buff B ist bei BB_CAP gedeckelt — erneutes Volllaufen erneuert nur den Countdown', () => {
    const s = createBefehlState();
    s.buffStufe = BB_CAP; s.buffRest = 2; // Buff läuft aus
    markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a', false); registriereKill(s, 'b', false); registriereKill(s, 'c', false);
    markiere(s, 'd'); markiere(s, 'e'); markiere(s, 'f');
    registriereKill(s, 'd', false); registriereKill(s, 'e', false);
    registriereKill(s, 'f', false); // Cap erneut
    expect(s.buffStufe).toBe(BB_CAP); // nicht über +3 gestapelt
    expect(s.buffRest).toBe(BUFF_TIME); // nur erneuert
  });
});

describe('BBB — grenzenlos & permanent', () => {
  it('Aufbau wächst über BB_CAP hinaus, Sockel wächst mit', () => {
    const s = createBefehlState();
    baueKette(s, 9); // 3 Reihen → kette 9, Aufbau 6
    expect(aufbauStufe(s)).toBe(6);
    expect(s.buffStufe).toBe(6); // perma-Sockel mitgewachsen
    expect(s.buffRest).toBeLessThan(0); // permanent markiert
  });

  it('gehaltener Bonus verfällt nie und überlebt den Ketten-Abriss', () => {
    const s = createBefehlState();
    baueKette(s, 6); // Aufbau 3, Sockel 3
    expect(s.buffStufe).toBe(3);
    const r = tickBefehl(s, COMBO_TIME + 1); // Abriss-Timer voll
    expect(r.abriss).toBe(true);
    bruch(s); // main reagiert auf den Abriss
    expect(s.kette).toBe(0);
    expect(s.buffStufe).toBe(3); // Sockel bleibt!
    expect(s.buffRest).toBeLessThan(0);
    expect(schadenStufe(s)).toBe(3);
  });
});

describe('Bruch bei Vorgriff', () => {
  it('nullt Kette/Marken/Zeiger, aber der gehaltene Buff überlebt', () => {
    const s = createBefehlState(); markiere(s, 'a'); markiere(s, 'b'); markiere(s, 'c');
    registriereKill(s, 'a', false);
    s.buffStufe = 2; s.buffRest = 5; // gehaltener Buff
    expect(trefferArt(s, 'c')).toBe('vorgriff');
    bruch(s);
    expect(s.kette).toBe(0);
    expect(s.marks).toHaveLength(0);
    expect(s.nextOrder).toBe(1);
    expect(s.buffStufe).toBe(2); // überlebt den Reihenfolge-Fehler
    expect(s.buffRest).toBe(5);
  });
});

describe('tickBefehl — Abriss & Buff-Countdown', () => {
  it('meldet Abriss, wenn der Ketten-Timer ohne Kill ausläuft', () => {
    const s = createBefehlState();
    baueKette(s, 4);
    expect(tickBefehl(s, COMBO_TIME + 0.1).abriss).toBe(true);
  });

  it('tickt nicht ohne aktive Kette', () => {
    const s = createBefehlState();
    s.combo = 5; // kette 0
    expect(tickBefehl(s, 1).abriss).toBe(false);
    expect(s.combo).toBe(5);
  });

  it('Buff B (Countdown) tickt aus → Stufe verschwindet', () => {
    const s = createBefehlState();
    s.buffStufe = BB_CAP; s.buffRest = 1;
    tickBefehl(s, 1.5);
    expect(s.buffRest).toBe(0);
    expect(s.buffStufe).toBe(0);
  });

  it('permanenter Sockel (buffRest<0) tickt NICHT aus', () => {
    const s = createBefehlState();
    s.buffStufe = 5; s.buffRest = -1;
    tickBefehl(s, 100);
    expect(s.buffStufe).toBe(5);
    expect(s.buffRest).toBe(-1);
  });
});

describe('MAX_MARKS-Konstante', () => {
  it('ist 3 (drei Ziele)', () => { expect(MAX_MARKS).toBe(3); });
});
