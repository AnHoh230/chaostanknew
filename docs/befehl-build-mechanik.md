# B-Build — „Befehl" (Kommandant / Kern-Pol)

Zweiter Build neben Z-Garten (Seuche) und R-Raum. Intern Kanal `sniper_core`. Thema: Ziele
**markieren** und **in Reihenfolge exekutieren**. Gegenstück zum Garten — statt Zustand zu säen,
befiehlt man Ziele und arbeitet sie diszipliniert ab.

Gewählt über den Start-Screen-Stil `sniper` (Garten = `dot`). Waffen-Ökonomie (Munition/Slomo/
Nachladen, Rechtsklick-Scope) wie beim Garten, nur die Kern-Wirkung ist anders.

## Stufen (über Impulse: sniper_core St 0 → 3, wie Garten dot_core)

### B — Markieren & Verwundbarkeit
- **Rechtsklick halten** = Markier-Modus (Slomo). Bis zu **3 Ziele** markieren → blinkendes Fadenkreuz.
- Markierte werden **verwundbar** (mehr Schaden) **und langsam** (wie der Gift-Slow).
- Rechtsklick **loslassen** → die markierten Ziele abschießen.
- Schüsse auf Markierte kosten **keine Munition**. Nachladen (R) gibt **Speed**.
- Markierte sterben **NIE instant** — immer über (erhöhten) Schaden.

### BB — Reihenfolge & Kaskade
- Zielscheiben tragen **Nummern 1·2·3** (= Markier-Reihenfolge).
- Streng der Reihe nach abarbeiten: das **aktuelle** Ziel (Nr. = `nextOrder`) beliebig oft beschießen
  (1·1·1 bis tot, dann 2·2·2, dann 3·3·3). Ein Treffer auf ein **höheres** markiertes Ziel
  (Vorgriff: 2 vor 1, 3 vor 2) **bricht** die Kaskade → alle Ziele verfallen, neu setzen.
- In Reihenfolge killen → **kaskadierender Movement-Speed** (steigt mit `kette`).
- Volle 3er-Reihe → **neue Ziele setzen sich automatisch** (auf verfügbare Gegner).
- Ab BB schießt man **auch ohne Rechtsklick** — Rechtsklick setzt nur noch *initial* die Ziele.
- **Combo-Timer 10 s** (HUD-Countdown): jeder markierte Kill refresht ihn; läuft er ab → Kette
  bricht (Auto-Nachsetzen stoppt, wieder per Rechtsklick markieren).

### BBB — Verstärkung & Finale
- **Verstärkungsbuff**: erste volle 3er-Reihe = Stufe 1, **jeder weitere in-Reihe-Kill +1**. Hebt den
  **Schaden an Markierten** (analog Erntefieber → Giftschaden beim Garten).
- Ab **6** in-Reihe-Kills → **Simultan-Schuss**: man visiert einen Markierten an, **alle** Markierten
  werden getroffen & getötet.

## Reine Logik

`src/build/befehl.ts` (TDD): Reihenfolge-/Kaskaden-/Combo-Zustandsmaschine — `markiere`, `trefferArt`
(aktuell/vorgriff/fremd), `registriereKill` (Kette hoch, Reihe komplett), `bruch`, `verstaerkung`,
`tickCombo`. Konstanten `MAX_MARKS 3`, `COMBO_TIME 10`, `SIMULTAN_SCHWELLE 6`, `VERSTAERK_AB 3`.
Balance-Werte (Verwundbarkeit, Slow, Speed-pro-Kette, Schaden-pro-Buffstufe) leben im main-Wiring.

## Status
- [x] Reine Zustandsmaschine + Tests
- [ ] Build-Auswahl entkoppeln (GARTEN_MODE über Stilwahl: dot=Garten, sniper=Befehl)
- [ ] Phase B: Markier-UI + Verwundbar/Slow + munitionsfrei + Reload-Speed
- [ ] Phase BB: Reihenfolge-Zähler-HUD + Kaskaden-Speed + Auto-Nachziele + Schießen ohne Scope + Combo-Timer-HUD
- [ ] Phase BBB: Verstärkungsbuff + Simultan-Schuss
