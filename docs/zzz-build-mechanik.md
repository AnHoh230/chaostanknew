# ZZZ-Build („Seuche") + Kommandant — Mechanik-Referenz

> Stand: aktueller Code (`src/build/garten.ts`, `src/build/gartenProgression.ts`, `src/main.ts`,
> `src/evolution/*`). Zweck: vollständige, exakte Beschreibung der **aktuell implementierten** Mechanik,
> als Grundlage für das Skill-Baum-/Ulti-Design. Alle Zahlen sind die echten Default-Werte.
> Was es noch NICHT gibt, steht in Abschnitt 7.

---

## 0. Kern-Loop in einem Satz

Du fährst über das Feld, **hältst Rechtsklick** (Zeit verlangsamt sich, du stehst still) und **infizierst**
mit deinen **3 Schuss Munition** gezielt Gegner. Loslassen → du fährst/weichst aus und lädst mit **R** nach.
Das Gift **reift von selbst**, **steckt Nachbarn an**, und reife Panzer **bleiben stehen und sterben am Gift**.
Jeder so geerntete Panzer gibt **Erntefieber** (Dauer-Buff), das das Gift tödlicher macht — die Seuche
trägt sich mit der Zeit selbst.

Der Build wird **erspielt**: durch Kills sammelst du Impulse, die den Build von Stufe 0 → ZZZ hochleveln.

---

## 1. Der Kommandant (Steuerung & Waffen-Ökonomie)

### 1.1 Bewegung
- **Fahren: WASD** (Chassis-Lenkung). W/S = vor/zurück entlang der Blickrichtung, A/D = Wanne drehen.
  Schweres Fahrzeug mit Trägheit, Drehrate skaliert mit Tempo.
- **Turm** zielt **unabhängig per Maus** (Cursor = Zielpunkt).
- **Dash: Shift** — kurzer Burst vorwärts. Distanz ~14, Dauer 0,16 s, **Cooldown 5 s**.
- Spieler-Test-HP: **160** (Klasse „haubitze").

### 1.2 Scope = Infizier-Modus (Rechtsklick HALTEN)
Rechtsklick **gedrückt halten** schaltet den Scope ein, loslassen aus (Halten, kein Toggle):
- **Bewegung gestoppt** — im Scope steht der Panzer (du kannst nicht fahren während du schießt/infizierst).
- **Weite Kamera** (Übersicht; im Fahrmodus näher dran).
- **Nur im Scope wird gefeuert.** Außerhalb feuert der Schuss nicht.
- Solange Scope an + Munition + Slomo-Zeit übrig → **Slomo aktiv** (siehe 1.3).

### 1.3 Slomo (Bullet-Time)
- Aktiv, **solange** `Scope an UND Munition > 0 UND Slomo-Zeit > 0`.
- **Die Welt läuft auf ×0,2** (Gegner, Geschosse, Gift-Ticks kriechen). **Dein Feuertakt bleibt echtzeit**
  → du setzt die 3 Dots zügig, während die Gegner kaum vorrücken.
- Begrenzt durch ein **Zeit-Budget: 3 s pro Magazin**, das in Echtzeit runterläuft, während der Slomo an ist.
- Slomo **endet, sobald Munition ODER Slomo-Zeit leer ist** — was zuerst kommt (kein ewiger Slomo durch
  Zurückhalten des letzten Schusses).

### 1.4 Munition & Nachladen
- **3 Schuss** (Infektionen) pro Magazin. Jeder Schuss = −1.
- **Feuertakt: 0,14 s** zwischen Schüssen (knapp — die Munition limitiert, nicht die Rate).
- Leer → **R drücken zum Nachladen**: Dauer **2,2 s**, nicht sofort. Füllt **Munition UND Slomo-Zeit** wieder
  auf (ein Magazin = Schüsse + Slomo-Sekunden).
- **Während des Nachladens: +70 % Tempo** (×1,7) — das ist die *mobile Ausweich-Phase*.
- **Kein Scope während des Nachladens** — Rechtsklick ist gesperrt, solange `R` läuft (Nachladen = mobil,
  Scope = stationär, schließen sich aus).

### 1.5 Anzeige
- **Munitions-/Nachlade-Leiste** (unten Mitte): `Munition ●●● · Slomo 3.0s`, im Nachladen `⟳ Nachladen 1.4s`.
- **Frontformung-HUD** (unten rechts): aktuelle Build-Stufe + Fortschrittsbalken zur nächsten Stufe.
- **Scope-Badge** (oben, nur im Scope): `🦠 St2 · ZZ · Seuche` bzw. ab ZZZ `… — Erntefieber +N`.
- **Fadenkreuz** am Ziel unter dem Cursor: grün = feuerbereit, orange = im Feuer-Cooldown.

### 1.6 Steuerungs-/Waffen-Werte (Stellschrauben)
| Wert | Default | Bedeutung |
|---|---|---|
| `AMMO_MAX` | 3 | Schüsse pro Magazin |
| `GARTEN_FIRE_BASE` | 0,14 s | Feuer-Cooldown zwischen Schüssen |
| `RELOAD_TIME` | 2,2 s | Nachlade-Dauer |
| `RELOAD_SPEED` | ×1,7 | Tempo-Faktor während des Nachladens |
| `SLOMO_SCALE` | 0,2 | Welt-Zeitfaktor im Slomo (Feuertakt bleibt real) |
| `SLOMO_TIME` | 3 s | Slomo-Budget pro Magazin |
| Dash | 14 / 0,16 s / CD 5 s | Distanz / Dauer / Cooldown |

---

## 2. Der Build-Aufbau (Progression über das Evolutions-System)

Der ZZZ-Build wird **erspielt**, nicht von Anfang an gegeben. Maschinerie: das `evo`-System, Kanal
**`dot_core`** („Zustand").

- **Jeder Kill** lässt einen **Impuls-Orb** fallen, der zum Spieler fliegt und Fortschritt in `dot_core` gibt
  (egal was der Kompass zeigt — im Garten zahlt **alles** auf Zustand ein). Normaler Gegner = 5 Punkte,
  Bunker = 9.
- **Stufen-Schwellen** (Profil `LOOP_TEST`): **25 / 70 / 150** Gesamt-Fortschritt für Stufe 1 / 2 / 3.
- **Zeitfenster:** erste Stufe frühestens nach **20 s**, danach **mind. 25 s** Abstand. Eine Stufe schaltet
  also frei, wenn *beides* erfüllt ist (genug Kills **und** genug Zeit).
- Beim Freischalten: Toast `🦠 STUFE n · …`, der Frontformung-HUD zeigt Stufe + Balken.

**Was jede Stufe freischaltet:**
| Stufe | Name | Schuss-Wirkung |
|---|---|---|
| 0 | Grundschuss | direkter Treffer-Schaden (noch kein Gift) |
| 1 | Z · Gift | Schuss **infiziert** (Gift säen) + Verlangsamung; reiner Köchel-DoT |
| 2 | ZZ · Seuche | Gift **reift** + **steckt an**; reife stehen & sterben am Gift |
| 3 | ZZZ · Ernte | reifer Gift-Tod gibt **Erntefieber** (Buff) |

> Referenz-Run (`run-074`): St1 @ 0:26, St2 @ 1:19, ZZZ @ 2:01 — alles kill-erspielt.

**Wichtig / offene Stelle:** Ab Stufe 3 ist `dot_core` auf Maximum — **weitere Impulse tun aktuell nichts**.
Genau hier soll das Skill-Baum-/Ulti-System ansetzen (Abschnitt 7).

---

## 3. Die Gift-Mechanik im Detail

Jeder vergiftete Gegner trägt einen `GiftState`: **`potency`** (Giftstärke) + **`tickCd`** (Zeit bis zum
nächsten Tick). Gift-Ticks fallen alle **`tickEvery` = 0,5 s**.

### 3.1 Stufe 0 — Grundschuss
Schuss macht **direkten Schaden** (Klassen-Schaden), kein Gift. Übergangsphase, bis Z ausgebildet ist.

### 3.2 Stufe 1 (Z) — Infizieren + Verlangsamung
- Schuss **sät Gift**: `potency += saat` (6). Erneutes Schießen stapelt (`+6`).
- Das Gift ist hier ein **reiner Köchel-DoT: 6 Schaden pro Tick** (`GIFT_DOT_ST1`) = 12/s. **Kein Reifen,
  keine Ansteckung, kein Reif-Zustand.** Tötet langsam (z. B. 75-HP-Gegner in ~6 s).
- **Verlangsamung:** konstant ~**50 %** Tempo weg (frische Potenz, siehe `giftSlow`).

### 3.3 Stufe 2 (ZZ) — Reifung, Drosselung, Ansteckung
Ab hier läuft die **echte Gift-Logik** (`tickGift`) statt des Köchel-DoT:
- **Reifung:** solange unreif, jeder Tick `potency ×= reife` (×1,15) und **kleiner Köchel `tickDmg` = 1**.
  Von einer frischen Infektion (potency 6) bis zur Schwelle (`erntePot` = 36) sind das **13 Ticks ≈ 6,5 s**
  (Inkubation), dabei ~13 Schaden.
- **Progressive Drosselung** (`giftSlow`): genommenes Tempo = `slow + (1−slow)·(potency/erntePot)`,
  also **frisch ~50 % → reif 100 % (steht völlig still)**.
- **Reif** (`potency ≥ 36`): der Panzer **steht**, **raucht/pulsiert rot**, und das Gift wird **tödlich**:
  **`reifDmg` = 9 pro Tick** (= 18/s) statt des Köchels. Er stirbt am Gift — der Spieler schießt ihn NICHT ab.
- **Ansteckung:** bei **jedem Tick** (0,5 s) steckt jeder Infizierte den **nächstgelegenen gesunden** Panzer
  in **`ansteckRadius` = 30** an (frische Infektion beim Nachbarn). Kein Limit pro Panzer, keine Kosten →
  in dichten Pulks (Schwarm) breitet sich die Seuche in Sekunden über alle aus.

### 3.4 Stufe 3 (ZZZ) — Ernte & Erntefieber
- Stirbt ein **reifer** Panzer am Gift → **Erntefieber +1** (dauerhafter Spieler-Buff für den Run) + Toast
  `🦠 ERNTESIEG`. Optisch: der Panzer verliert sofort das Rot, wird **grau** und sackt zusammen
  (`GARTEN_HARVEST_TIME` = 0,4 s), dann verschwindet er.
- **Einziger Buff-Effekt:** jeder Erntefieber-Punkt erhöht den **reifen** Gift-Schaden um **`dmgProFieber` = 2**.
  Reif-Schaden = `9 + Erntefieber·2` pro Tick. Reife sterben also schneller → häufiger Ernten → mehr
  Erntefieber. (Inkubation, Säen und Ansteckung bleiben vom Erntefieber **unberührt**.)
- Stirbt ein Panzer **vor** der Reife (z. B. am Köchel) → normaler Tod, **kein** Erntefieber.

### 3.5 Gift-Werte (`DEFAULT_GARTEN`, Stellschrauben)
| Wert | Default | Bedeutung |
|---|---|---|
| `saat` | 6 | Start-Potenz pro Schuss |
| `reife` | 1,15 | Potenz-Faktor pro Tick (Inkubations-Tempo) |
| `tickEvery` | 0,5 s | Zeit zwischen Gift-Ticks |
| `tickDmg` | 1 | Köchel-Schaden während der Reifung (ZZ) |
| `GIFT_DOT_ST1` | 6 | reiner DoT auf Stufe 1 (Z) |
| `reifDmg` | 9 | tödlicher Schaden pro Tick sobald reif |
| `slow` | 0,4 | Mindest-Drosselung frischer Infektion (steigt bis 1 = steht) |
| `erntePot` | 36 | Potenz-Schwelle für „reif" |
| `ansteckRadius` | 30 | Welt-Radius der Ansteckung (Feld ist ~130+) |
| `dmgProFieber` | 2 | +reifDmg pro Erntefieber-Punkt |

**Abgeleitet:** Inkubation (frisch→reif) ≈ 6,5 s · Reif-Stufen-Glühen bei potency 10,8 / 21,6 / 36
(grün → gelb → rot).

---

## 4. Reife-Zustände & Optik
`reifeStufe` 0–3 aus `potency/erntePot`: <0,3 = 0 (dunkelgrün), ≥0,3 = 1 (grün), ≥0,6 = 2 (gelb),
≥1 = 3 (rot, reif). Reife Panzer **pulsieren** rot. Geerntete werden **grau** und sinken (0,4 s) vor dem Tod.

---

## 5. Gegner & Welle (Kontext für Balance)

Die Gegner-Eskalation ist **zeit-getrieben** (`gegnerWelle(t)`), unabhängig vom Build-Leveln — daraus ergibt
sich das Wettrennen „erspielter Build vs. wachsender Druck".

| ab Zeit | gleichzeitig | Typ-Mix | Gegner-Level | Spawn-Takt |
|---|---|---|---|---|
| 0:00 | 6 | 100 % Allrounder | 1 | 1,4 s |
| 0:25 | 7 | Allrounder | 1 | 1,3 s |
| 1:10 | 9 | 50 Allr · 25 Läufer · 25 Schwarm | 2 | 1,1 s |
| 2:10 | 12 | Allr · Läufer · Schwarm · Brocken | 3 | 0,9 s |
| ab 3:30 | 16 → 30 (Cap) | mehr Schwarm | 3 + alle 90 s +1 | 0,9 → 0,5 s |

**Typen** (Basis-Stats Level 1, skalieren je Level: HP ×1,15, Schaden ×1,18, Tempo ×1,04):
| Typ | HP | Schaden | Tempo | Eigenheit |
|---|---|---|---|---|
| Allrounder | 75 | 14 | 8 | Grundgegner |
| Läufer (racer) | 55 | 16 | 12 | schnell, fragil — Druckmacher |
| Schwarm (swarm) | 35 | 8 | 9 | **spawnt als Pulk (5 auf einen Punkt)** → ideales Ansteckungs-Futter |
| Brocken (bunker) | 220 | 40 | 5 | zäh, langsam — lange reife Brutherde |

---

## 6. Zusammenfassung: alle Stellschrauben fürs Skill-Design
Woran Ultis/Verstärkungen drehen könnten, ohne neue Systeme zu brauchen:
- **Säen:** `saat` (Start-Potenz), Schüsse pro Schuss-Aktion.
- **Inkubation:** `reife` (schneller reif), `erntePot` (Schwelle).
- **Schaden:** `GIFT_DOT_ST1`, `tickDmg`, `reifDmg`, `dmgProFieber` (Erntefieber-Skalierung), `tickEvery`.
- **Drosselung:** `slow`.
- **Ansteckung:** `ansteckRadius`, Anzahl Nachbarn pro Tick (aktuell 1), Kosten/Limit (aktuell keins).
- **Ernte/Erntefieber:** Punkte pro Ernte (aktuell +1), zusätzliche Effekte beim Ernten (aktuell nur Buff).
- **Waffe:** `AMMO_MAX`, `RELOAD_TIME`, `RELOAD_SPEED`, `SLOMO_TIME`, `SLOMO_SCALE`, `GARTEN_FIRE_BASE`.
- **Spieler:** HP, Heilung (existiert nicht), Tempo.

---

## 7. Was es (noch) NICHT gibt — der Platz fürs Skill-System
- **Keine Heilung.** Der Spieler kann nur HP verlieren (Survivor-Ceiling). „Ernten heilt" wäre neu.
- **Keine Skillpunkte / Bäume / Ultis.** Ab Stufe 3 (ZZZ komplett) sind weitere Impulse **wirkungslos** —
  hier soll das geplante System ansetzen: Impulse → Skillpunkte, **Kompass lenkt** in 3 Bäume
  (Zustand / Befehl / Raum), pro Baum erst eine von 3 **Ultis** wählen, darunter Verstärkungen.
- **Befehl & Raum** (die anderen Build-Pole) sind als Build noch nicht implementiert — nur Zustand (ZZZ) läuft.
- Der **Kompass** ist aktuell ohne Funktion im Garten (alles zahlt fix auf Zustand ein); er soll mit dem
  Skill-System seinen Sinn als „Lenker des Wachstums" zurückbekommen.
