# Spec 5 — Implementierungs-Gates, Balance-Regeln & Lückenfüller

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** verbindliche Umsetzungs-Guardrail für Spec 0–4
- **Hängt an:** Spec 0 Fundament, Spec 1 Kompass-Konsole, Spec 2 Finisher, Spec 3 Spieler-Evolution, Spec 4 Kompass-Fusion
- **Rolle:** Diese Spec ersetzt nicht die Vision. Sie entscheidet die offenen mechanischen Fragen so, dass Claude daraus Implementierungspläne, Module und Tests ableiten kann.

---

## 1. Zweck dieser Spec

Spec 0–4 beschreiben eine starke Vision: Der Run häutet sich alle 5–10 Minuten, alte Schichten verhärten, der Kompass wird zur Maschine, Finisher entladen vorbereitete Gegnerzustände, und der Spieler evolviert zu neuen Grundtypen.

Diese Spec macht die Vision implementierbar. Sie definiert:

1. klare Gates für die Umsetzung,
2. harte Entscheidungen für offene Lücken,
3. Balance-Formeln statt Bauchgefühl,
4. Default-Werte mit Rechnung,
5. Regeln, nach denen Claude kleinere Lücken selbst schließen darf,
6. Test- und Telemetrie-Anforderungen, damit die 5–10-Minuten-Häute messbar werden.

Wenn Spec 1–4 bei Detailmechaniken unklar sind, gilt für die Umsetzung diese Spec. Die Invarianten aus Spec 0 bleiben darüber: Kommander ist die Ausgangsklasse, Befehl/Raum/Zustand sind Builds/Pole, Evolution ist qualitativ und nicht nur ein Schadensmultiplikator.

---

## 2. Zentrale Korrektur: Level und Treibstoff werden getrennt

### Problem

In Spec 1 ist `Ladung` zugleich Level und Treibstoff. Das erzeugt einen Widerspruch:

- Ein Pol ist bei 5 Ladungen gemaxt.
- Ein gemaxtes Pol-Paar schaltet Finisher und Evolution frei.
- Finisher verbrauchen Ladungen.
- Finisher müssen mehrfach zünden, um zu verhärten.

Wenn Ladungen verbraucht werden, wäre unklar, ob der Pol wieder nicht gemaxt ist. Dadurch könnten Finisher oder Evolution rückwirkend ungültig werden. Das darf nicht passieren.

### Entscheidung

Ab jetzt gibt es pro Pol zwei getrennte Größen:

- **Level**: dauerhafter Ausbau von 0 bis 5.
- **Fuel**: verbrauchbarer Treibstoff für Finisher.

Einmal erreichte Meilensteine bleiben erhalten.

```ts
export interface PolState {
  level: number;          // 0..POL_MAX_LEVEL, dauerhaft
  reachedMax: boolean;   // wird einmal true und bleibt true
  progress: number;      // Fortschritt zum nächsten Level
  fuel: number;           // verbrauchbarer Treibstoff
  fuelProgress: number;   // Fortschritt zur nächsten Fuel-Einheit
  fuelCap: number;        // Speichergrenze
}
```

### Regel

- `level` entscheidet, ob ein Pol gemaxt wurde.
- `reachedMax` bleibt true, auch wenn Fuel verbraucht wird.
- `fuel` wird beim Finisher-Feuern verbraucht.
- Evolution, Finisher-Schmieden und Systemform lesen `reachedMax`, nicht `fuel`.
- Kein System darf `level` senken.

---

## 3. Kompass-Ökonomie

### Constants

```ts
export const POL_MAX_LEVEL = 5;
export const KOMPASS_WACHSTUM = 1.25;
export const TARGET_PAIR_MINUTES = 7.5;
export const TARGET_IMPULSE_PER_MINUTE = 30;
export const POL_FUEL_CAP = 6;
export const FUEL_IMPULSE_COST = 10;
```

### Berechnung der Levelkosten

Die Levelkosten folgen weiter der bisherigen Idee:

```txt
kosten(levelIndex) = basis * wachstum^levelIndex
```

Für 5 Level und Wachstum 1.25 gilt:

```txt
SummeGewichte = 1 + 1.25 + 1.25² + 1.25³ + 1.25⁴
              = 8.20703125
```

Ein Pol kostet:

```txt
PolKosten = basis * 8.20703125
```

Ein Pol-Paar kostet:

```txt
PaarKosten = basis * 16.4140625
```

Damit ein Paar bei 30 normalisierten Impulsen pro Minute ca. 7.5 Minuten dauert:

```txt
basis = TARGET_PAIR_MINUTES * TARGET_IMPULSE_PER_MINUTE / 16.4140625
basis = 7.5 * 30 / 16.4140625
basis ≈ 13.71
```

### Default

Für die Implementierung wird gerundet:

```ts
export const KOMPASS_BASIS = 14;
```

Daraus folgen pro Pol:

| Level | Kosten |
|---:|---:|
| 1 | 14.00 |
| 2 | 17.50 |
| 3 | 21.88 |
| 4 | 27.34 |
| 5 | 34.18 |

Ein Pol kostet ca. 114.9 Impulse. Ein Pol-Paar kostet ca. 229.8 Impulse. Bei 30 normalisierten Impulsen pro Minute dauert ein Pol-Paar ca. 7.66 Minuten.

> Hinweis: Diese Default-Basis ist auf den `normalisiert`-Zielwert (30/min) geeicht. Im `roh`-Start-Modus entscheidet die per Telemetrie gemessene Killrate, ob `KOMPASS_BASIS` nachgezogen wird; Gate 2 prüft beide Modi.

### Warum nicht `BASIS = 10`?

`BASIS = 10` funktioniert nur, wenn die reale oder normalisierte Impulsrate bei ca. 22 Impulsen pro Minute liegt:

```txt
erforderliche Impulse/min = basis * 16.4140625 / zielMinuten
                         = 10 * 16.4140625 / 7.5
                         ≈ 21.9
```

Wenn das Spiel nach Skillbaum-Freischaltung eher bei 60–100 Kills/Impulsen pro Minute liegt, wäre `BASIS = 10` zu schnell.

---

## 4. Impuls-Normalisierung

### Problem

Wenn `1 Kill = 1 Impuls` bleibt, zerstört die Killrate das Pacing:

| Impulse/min | Paar mit BASIS 10 | Paar mit BASIS 14 |
|---:|---:|---:|
| 20 | 8.2 min | 11.5 min |
| 30 | 5.5 min | 7.7 min |
| 60 | 2.7 min | 3.8 min |
| 100 | 1.6 min | 2.3 min |

Das Spiel soll stärker werden dürfen, aber die Häutungen dürfen nicht aus Versehen in 90 Sekunden durchrauschen.

### Entscheidung: umschaltbare Impuls-Politik (`roh` ↔ `normalisiert`)

Statt Normalisierung fest zu verdrahten, liegt die Einspeisung hinter **einer reinen Funktion** mit zwei Implementierungen — testbar, im Spiel per Flag umschaltbar, ohne Umbau am Kompass:

```ts
export type ImpulsModus = 'roh' | 'normalisiert';
export const IMPULS_MODUS: ImpulsModus = 'roh'; // Start: Dopamin

export const NORMALIZE_WINDOW_SECONDS = 60;
export const IMPULSE_RATE_MIN_MULT = 0.35;
export const IMPULSE_RATE_MAX_MULT = 2.5;

// roh:          effektiv = raw                               (mehr Kills -> mehr Fortschritt, VS-Dopamin)
// normalisiert: effektiv = raw * clamp(ziel/ewma, min, max)  (verlaessliche Zeit-Taktung)
export function effektiverImpuls(raw, ewmaRawProMin, modus): number;
```

Der Kompass sieht **nur** den effektiven Impuls und kennt den Modus nicht. Tausch = ein Flag, kein Rewrite — `level`/`fuel`/Finisher/Evolution bleiben unberührt.

### Reihenfolge: erst Dopamin, dann messen, dann ggf. flippen

1. Start im Modus `roh` (1 Kill ≈ 1 Impuls) — einfachste Variante, VS-Feel, der erste Playtest.
2. Die EWMA-Rate läuft **von Anfang an als reine Telemetrie mit** (Gate 8), auch im `roh`-Modus — so messen wir die echte Killrate.
3. Zeigt Telemetrie/Sim, dass die Häute durchrauschen (z. B. erstes Paar < 3 min bei hoher Rate), wird per Flag auf `normalisiert` geschaltet. Kein Rewrite.

### Designregel

Im `normalisiert`-Modus stabilisiert die Glättung das Pacing, ohne gute Builds zu egalisieren — der Multiplikator ist auf `[0.35, 2.5]` begrenzt (gute Builds bleiben schneller, schlechte werden nicht abgehängt). Im `roh`-Modus zählt der Durchsatz voll (Dopamin).

### Gate

Es muss einen reinen Simulations-Test geben (für **beide Modi** gegen dieselben Traces):

- Bei 20 raw Impulsen/min: erstes Pol-Paar in 5–10 Minuten oder knapp darüber.
- Bei 30 raw Impulsen/min: erstes Pol-Paar in 5–10 Minuten.
- Bei 60 raw Impulsen/min: erstes Pol-Paar nicht unter 4 Minuten.
- Bei 100 raw Impulsen/min: erstes Pol-Paar nicht unter 3 Minuten.

Wenn diese Tests nicht erfüllt sind, wird nicht weitergebaut, sondern die Ökonomie angepasst.

---

## 5. Fuel-Regeln

### Fuel-Erzeugung

Wenn ein aktiver Pol noch nicht Level 5 ist, fließen Impulse zuerst in `progress`.

Wenn ein aktiver Pol Level 5 erreicht hat, fließen weitere Impulse in `fuelProgress`.

```txt
FUEL_IMPULSE_COST = 10 normalisierte Impulse = +1 Fuel
```

### Fuel-Cap

```txt
POL_FUEL_CAP = 6
```

Ein Pol kann also maximal 6 Fuel speichern.

### Verhalten bei vollem Fuel

Wenn der aktive Pol gemaxt ist und Fuel voll ist:

1. Wenn es noch nicht gemaxte Pole gibt, wird dem Spieler ein Wechsel nahegelegt.
2. Technisch verfällt der Überlauf im MVP nicht still, sondern geht in `overflowWaste` für Telemetrie.
3. Später kann dieser Überlauf in Fusion/Systemform fließen. Das ist nicht Teil des MVP.

### Finisher-Kosten

Default:

| Tier | Bedarf | Fuelkosten pro Zündung |
|---:|---|---|
| 1 | 1 Pol | 1 Fuel im benötigten Pol |
| 2 | 2 Pole | je 1 Fuel in beiden benötigten Polen |
| 3 | 3 Pole | je 2 Fuel in allen drei Polen |

Damit braucht ein Tier-2-Finisher für 8 wirksame Zündungen insgesamt 8 Fuel pro beteiligtem Pol. Bei 10 Impulsen pro Fuel und 30 Impulsen/min dauert das Nachladen für beide Pole zusammen rechnerisch ca. 5.3 Minuten, wenn der Spieler sauber zwischen den beiden Polen lenkt.

```txt
8 Zündungen * 2 Fuel = 16 Fuel total
16 Fuel * 10 Impulse = 160 Impulse
160 / 30 Impulse pro Minute = 5.33 Minuten
```

Das passt zur 5–10-Minuten-Haut, wenn Bauplan und Board-State nicht zusätzlich massiv verzögern.

---

## 6. Blueprint-Regeln

### Problem

Seltene Drops sind gut für VS-Spannung. Aber die Hauptprogression darf nicht daran scheitern, dass der passende Bauplan zufällig nicht kommt.

### Entscheidung

Blueprints bleiben Drops, aber mit Pity-System.

```ts
export const BLUEPRINT_SLOTS = 3;
export const FIRST_BLUEPRINT_PITY_SECONDS_AFTER_KOMPASS = 120;
export const RELEVANT_BLUEPRINT_PITY_SECONDS = 180;
```

### Drop-Gewichtung

Ein Blueprint gilt als relevant, wenn seine Pol-Anforderung mindestens einen der zwei höchsten Pol-Level des Spielers enthält.

Gewichtung:

- 60% Chance: Blueprint passt zu den zwei höchsten Polen.
- 25% Chance: Blueprint passt zu einem der zwei höchsten Pole.
- 15% Chance: fremder Blueprint, um Umschwenken möglich zu halten.

### Garantien

- Spätestens 120 Sekunden nach Kompass-Freischaltung erscheint der erste Blueprint.
- Spätestens 180 Sekunden nach dem letzten irrelevanten Blueprint erscheint ein relevanter Blueprint.
- Keine Duplikate, solange noch unbesessene Blueprints derselben Relevanzklasse existieren.
- Wenn Slots voll sind, muss es einen Ersetzen-/Ablehnen-Pfad geben.

### Tier-1-Anti-Dead-End

Tier-1-Finisher sind automatisch bekannt, sobald der jeweilige Pol Level 5 erreicht.

Paar-Finisher und Systembruch benötigen weiterhin Blueprints oder Combo-Schmieden.

Begründung: Der Spieler soll nach einem gemaxten Pol immer etwas ausprobieren können. Die seltenen Funde bleiben bei den stärkeren, runprägenden Finishers wichtig.

---

## 7. BoardScore: Wucht des Finishers

### Ziel

Ein Finisher darf nicht einfach eine Taste mit Fixschaden sein. Er muss den vorbereiteten Zustand der Arena lesen.

### Zustände

- Befehl: Gegner ist markiert.
- Raum: Gegner steht in einem Feld / ist gefangen.
- Zustand: Gegner ist verseucht / hat DoT-Stapel.

### Generic BoardScore

Für einen Finisher wird nur der Zustand gewertet, den er liest.

```ts
export const BOARD_WEIGHT_MARK = 1.0;
export const BOARD_WEIGHT_FIELD = 1.2;
export const BOARD_WEIGHT_POISON_STACK = 0.25;
export const BOARD_POISON_STACK_CAP = 8;
export const BOARD_WEIGHT_TWO_MATCHING_STATES = 2.0;
export const BOARD_WEIGHT_THREE_MATCHING_STATES = 5.0;
```

Pro Gegner:

```txt
score = Summe passender Einzelzustände
      + Synergiebonus, wenn mehrere vom Finisher gelesene Zustände auf demselben Gegner liegen
```

Gift wird gedeckelt:

```txt
giftScore = min(poisonStacks, BOARD_POISON_STACK_CAP) * BOARD_WEIGHT_POISON_STACK
```

### Mindestwerte für wirksame Zündungen

```ts
export const MIN_EFFECTIVE_BOARDSCORE_TIER_1 = 6;
export const MIN_EFFECTIVE_BOARDSCORE_TIER_2 = 10;
export const MIN_EFFECTIVE_BOARDSCORE_TIER_3 = 18;
```

Eine Zündung zählt nur dann für Verhärtung, wenn der BoardScore mindestens den Tier-Mindestwert erreicht.

### Power-Kurve

Die Wucht skaliert nicht endlos linear, sondern mit Wurzelkurve:

```txt
readiness = boardScore / minEffectiveBoardScore
powerMultiplier = tierBaseMultiplier * sqrt(readiness)
powerMultiplier = clamp(powerMultiplier, tierBaseMultiplier, tierMaxMultiplier)
```

Default:

| Tier | Base | Max |
|---:|---:|---:|
| 1 | 1.0 | 3.0 |
| 2 | 2.0 | 6.0 |
| 3 | 4.0 | 12.0 |

Das erlaubt große Entladungen, aber verhindert, dass ein einziger gigantischer Board-State alle Balance sprengt.

---

## 8. Finisher-Verhärtung

### Entscheidung

Ein Finisher verhärtet nach 8 **wirksamen** Zündungen.

```ts
export const FINISHER_EFFECTIVE_USES_TO_HARDEN = 8;
```

Eine wirksame Zündung erfüllt alle Bedingungen:

1. Finisher ist aktiv.
2. Genug Fuel ist vorhanden.
3. BoardScore erreicht den Tier-Mindestwert.
4. Die Zündung trifft mindestens einen Gegner oder verändert mindestens ein Feld.

Leere Zündungen verbrauchen im MVP kein Fuel und zählen nicht.

### Manueller Override

Nach Verhärtung feuert der Finisher automatisch, aber manuelles Feuern bleibt als Override erlaubt, wenn Fuel und BoardScore reichen.

Begründung: Verhärtung nimmt APM raus, aber sie darf dem Spieler kein Gefühl von Kontrollverlust geben.

---

## 9. Auto-Feuer-Regeln

### Problem

Auto-Feuer darf nie framebasiert sein. Sonst wird es unbalancierbar und technisch riskant.

### Entscheidung

Auto-Feuer läuft über einen Dispatcher.

```ts
export const AUTO_FIRE_EVALUATION_SECONDS = 1.0;
```

Einmal pro Sekunde prüft der Dispatcher:

1. Welche verhärteten Finisher sind aktiv?
2. Welche haben genug Fuel?
3. Welche erreichen ihren Mindest-BoardScore?
4. Welcher hat die höchste Readiness?

Dann feuert höchstens ein Finisher pro Tick.

```txt
readiness = boardScore / minEffectiveBoardScore
```

Bei Gleichstand gilt deterministische Reihenfolge:

1. höherer Tier,
2. höherer BoardScore,
3. früher geschmiedet,
4. feste Finisher-ID-Reihenfolge.

---

## 10. Evolution-Regeln

### Pair Mastery

Ein Pol-Paar ist gemeistert, wenn:

1. beide Pole `reachedMax = true` haben,
2. der passende Tier-2-Finisher aktiv ist,
3. dieser Tier-2-Finisher verhärtet ist.

### Erstes gemeistertes Paar

Das erste gemeisterte Paar setzt den Grundtyp:

| Paar | Grundtyp |
|---|---|
| Befehl + Raum | Architekt / Feldherr |
| Raum + Zustand | Alchemist / Verseucher |
| Befehl + Zustand | Richter / Manipulator |

Der Grundtyp ist sticky: Er wechselt im MVP nicht mehr, wenn später ein zweites Paar gemeistert wird.

### Gleichzeitige Meisterschaft

Wenn zwei Paare im selben Tick gemeistert werden, gilt:

1. Paar mit mehr wirksamen Zündungen seines Tier-2-Finishers gewinnt.
2. Wenn gleich: Paar, das den Hauptbuild des Runs enthält.
3. Wenn immer noch gleich: feste Reihenfolge Befehl+Raum, Raum+Zustand, Befehl+Zustand.

Claude darf hier keine neue Auswahl-UI erfinden. Eine spätere manuelle Wahl ist post-MVP.

---

## 11. Fusion und Systemform

### Problem

Mit nur drei Polen ist `zwei gemeisterte Paare` sehr nah an `alle drei Pole gemaxt`. Fusion wäre dadurch möglicherweise keine echte Phase.

### Entscheidung

Fusion wird in drei Stufen getrennt:

#### 1. Fusion Preview

Startet, wenn:

- ein Paar gemeistert ist,
- und der dritte Pol mindestens Level 1 erreicht.

Effekt: leichte visuelle Mischsignale, noch keine großen Regeln.

#### 2. Fusion Phase

Startet, wenn:

- ein Paar gemeistert ist,
- und der dritte Pol mindestens Level 3 erreicht.

Effekt: erste Cross-Pol-Interaktionen dürfen permanent laufen, aber begrenzt.

#### 3. Systemform

Startet, wenn:

- alle drei Pole `reachedMax = true` haben,
- Systembruch geschmiedet ist.

Systembruch wird geschmiedet, wenn:

- entweder zwei Tier-2-Finisher verhärtet sind,
- oder zwei Tier-2-Finisher innerhalb von 8 Sekunden wirksam kombiniert wurden,
- und der Spieler den Systembruch-Blueprint besitzt oder durch die Combo freischaltet.

### System-Edikt

Default:

```ts
export const EDIKT_DAUER_SECONDS = 6;
export const EDIKT_COOLDOWN_SECONDS = 30;
export const EDIKT_TICK_SECONDS = 0.75;
export const EDIKT_MAX_PULSES = 8;
```

Während des Edikts darf nicht jeder Finisher unkontrolliert pro Frame laufen. Stattdessen gibt es maximal 8 Edikt-Pulse. Pro Puls darf ein Systemeffekt auslösen.

Priorität pro Puls:

1. Auto-Herrichten neuer Gegner,
2. bester aktiver Finisher,
3. Raum-/Zeit-Verzug.

---

## 12. Implementierungs-Gates

Jedes Gate muss mit Tests abschließen. Kein Gate darf heimlich die nächste Schicht mitbauen, außer als Stub.

### Gate 0 — Spec-Import und Konstanten

Ziel: Tuning-Werte zentralisieren.

Module:

- `src/build/evolutionTuning.ts`
- keine Gameplay-Änderung

Muss enthalten:

- alle Konstanten aus dieser Spec,
- Kostenfunktion,
- Berechnungshilfen für Pacing,
- reine Tests für Kosten und Summen.

Done:

- `tsc` grün,
- `vitest` grün,
- Test beweist: PaarKosten mit Defaultwerten ergeben ca. 229.8 Impulse.

---

### Gate 1 — Kompass Level/Fuel

Ziel: Kompass ohne Finisher implementieren.

Modul:

- `src/build/kompass.ts`

Muss können:

- Pol wählen,
- Impulse einspeisen,
- Level erhöhen,
- `reachedMax` sticky setzen,
- nach Max Fuel füllen,
- Fuel verbrauchen,
- Teilfortschritt je Pol behalten.

Pflichttests:

- Level sinkt nie durch Fuel-Verbrauch.
- `reachedMax` bleibt true.
- Fuel füllt erst nach Level 5.
- Fuel capped bei `POL_FUEL_CAP`.
- Wechsel des aktiven Pols verliert keinen Fortschritt.
- Vor Freischaltung nimmt Kompass nichts an.

---

### Gate 2 — Pacing-Simulation

Ziel: 5–10-Minuten-Ziel messbar machen.

Modul:

- `src/build/pacingSimulation.ts`

Muss simulieren:

- konstante Impulsrate,
- steigende Impulsrate,
- Pol-Paar-Max-Zeit,
- Fuel-Zeit für 8 Tier-2-Zündungen.

Done:

- Defaultziel bei 30 Impulsen/min: erstes Paar ca. 7–8 Minuten.
- Tier-2-Hardening-Fuel ca. 5–6 Minuten, wenn beide Pole abwechselnd gefüllt werden.
- Keine Simulation unter 3 Minuten für erstes Paar bei hoher Impulsrate nach Normalisierung.

---

### Gate 3 — Blueprint Controller

Ziel: Baupläne ohne Dead-End.

Modul:

- `src/build/blueprints.ts`

Muss können:

- relevante Blueprints gewichten,
- Pity auslösen,
- Duplikate vermeiden,
- Slots begrenzen,
- Ersetzen/Ablehnen modellieren.

Pflichttests:

- erster Blueprint spätestens nach Pity-Zeit,
- relevanter Blueprint spätestens nach Pity-Zeit,
- keine Duplikate, wenn Alternativen existieren,
- volle Slots blockieren nicht ohne Rückgabewert.

---

### Gate 4 — Ein vertikaler Paar-Finisher

Ziel: Nicht alle Finisher bauen. Erst eine vollständige Scheibe.

Empfohlener Finisher:

- `bombardement` für Befehl + Raum

Module:

- `src/build/finisher.ts`
- optional Adapter zum Board-State

Muss können:

- Blueprint nehmen,
- bei Pol-Max schmieden,
- BoardScore berechnen,
- manuell feuern,
- Fuel verbrauchen,
- nur wirksame Zündungen zählen,
- nach 8 wirksamen Zündungen verhärten,
- Auto-Feuer über Dispatcher.

Done:

- Der komplette Loop Befehl+Raum funktioniert in Pure-Tests.
- Keine leere Zündung zählt für Verhärtung.
- Auto-Feuer feuert höchstens einmal pro Dispatcher-Tick.

---

### Gate 5 — Erste Spieler-Evolution

Ziel: Aus einem gemeisterten Paar wird ein Grundtyp.

Modul:

- `src/build/evolution.ts`

Muss können:

- Pair Mastery erkennen,
- Grundtyp setzen,
- Grundtyp sticky halten,
- Gleichzeitigkeit deterministisch auflösen.

Done:

- Befehl+Raum wird Architekt/Feldherr.
- Zweites Paar überschreibt den Grundtyp nicht.
- Ohne verhärteten Paar-Finisher keine Evolution.

---

### Gate 6 — Restliche Finisher-Matrix

Ziel: Erst nach bewiesener Scheibe die Matrix vervollständigen.

Muss bauen:

- Generalbefehl,
- Einsturz,
- Seuchenausbruch,
- Sporenfeld,
- Urteil,
- Systembruch als geschmiedeter Finisher.

Done:

- Jeder Finisher hat Bedarf, gelesene Zustände, Fuelkosten, BoardScore-Test, Verhärtungstest.
- Tier-1-Finisher werden automatisch bekannt bei Pol-Max.
- Tier-2-Finisher brauchen Blueprint oder definierte Freischaltung.

---

### Gate 7 — Fusion und Systemform

Ziel: Systemform erst bauen, wenn Kompass, Finisher und Evolution stabil sind.

Module:

- `src/build/fusion.ts`

Muss können:

- Fusion Preview,
- Fusion Phase,
- Systemform-Reife,
- Edikt-Fenster,
- Edikt-Pulse,
- Edikt-Cooldown.

Done:

- Edikt läuft nicht framebasiert.
- Maximal 8 Pulse pro Edikt.
- Systemform nur mit 3 Max-Polen und Systembruch.

---

### Gate 8 — Telemetrie und Playtest-Auswertung

Ziel: Balance nicht raten.

Muss pro Run messen:

- Zeit bis Kompass-Freischaltung,
- Zeit bis erster Pol Level 5,
- Zeit bis erstes Pol-Paar Level 5,
- Zeit bis erster relevanter Blueprint,
- Zeit bis erster Paar-Finisher,
- Zeit bis Paar-Finisher verhärtet,
- Zeit bis erste Spieler-Evolution,
- Zeit bis Fusion Preview,
- Zeit bis Fusion Phase,
- Zeit bis Systemform,
- raw Impulse/min,
- normalisierte Impulse/min,
- verworfener Überlauf,
- Finisher-Zündungen,
- wirksame Finisher-Zündungen,
- durchschnittlicher BoardScore bei Zündung.

Done:

- Nach einem Testlauf kann man sagen, welche Haut zu schnell oder zu langsam ist.
- Ohne Telemetrie wird keine weitere Balance-Änderung vorgenommen.

---

## 13. Regeln für Claude beim Lückenfüllen

Claude darf kleinere Lücken selbst schließen, wenn alle folgenden Regeln eingehalten werden.

### Regel 1 — Vision vor Zahl

Wenn eine Zahl fehlt, darf Claude einen tunbaren Default setzen. Der Default muss als Konstante in `evolutionTuning.ts` landen und einen Test bekommen.

### Regel 2 — Keine neue Hauptwährung

Claude darf keine neue Hauptressource erfinden. Erlaubt sind nur:

- Level,
- Fuel,
- Blueprint,
- BoardScore,
- Mastery-Zähler,
- Telemetrie.

### Regel 3 — Qualitativer Durchsatz statt flacher Schaden

Wenn Balance fehlt, darf Claude nicht einfach `damageMultiplier *= 2` setzen. Erst prüfen:

- mehr Gegner hergerichtet?
- bessere Kette?
- größerer Wirkbereich?
- stärkere Board-State-Auszahlung?
- schnelleres Auto-Herrichten?

Schaden darf nur die letzte Stellschraube sein.

### Regel 4 — Oberste Schicht bleibt manuell

In jeder Phase bedient der Spieler nur die neueste Schicht aktiv. Alte Schichten dürfen automatisieren, aber nicht wieder dauerhaft APM verlangen.

### Regel 5 — Auto-Systeme sind getaktet

Alles Automatische braucht einen Takt, ein Budget oder einen klaren Trigger. Nie pro Frame feuern.

### Regel 6 — RNG darf keinen Dead-End bauen

Jeder Zufall, der Progression betrifft, braucht:

- Pity,
- Duplikat-Regel,
- Fallback,
- Telemetrie.

### Regel 7 — Meilensteine sind sticky

Ein freigeschalteter Meilenstein wird nicht rückgängig gemacht, außer eine Spec sagt ausdrücklich etwas anderes.

### Regel 8 — Erst eine Scheibe, dann Matrix

Wenn unklar ist, ob eine Mechanik trägt, baut Claude zuerst eine vertikale Scheibe mit einem Paar. Nicht sofort alle Varianten.

### Regel 9 — Keine versteckten Player-Facing-Begriffe

Interne Namen dürfen technisch sein. Spielertexte müssen klar bleiben: markieren, Feld, verseuchen, Finisher, Evolution. Keine unnötige Fantasie-Bürokratie in UI-Texten.

### Regel 10 — Bei Konflikt gilt diese Reihenfolge

1. Spec 0 Invarianten,
2. diese Spec für Mechanikdetails,
3. Spec 1–4 für Inhalt und Flavor,
4. bestehender Code,
5. Claude-Interpretation.

---

## 14. Implementierungsplan-Ableitung

Jeder konkrete Implementierungsplan soll diese Struktur haben:

```txt
Ziel:
  Welches Gate wird gebaut?

Nicht-Ziel:
  Was wird ausdrücklich noch nicht gebaut?

Betroffene Dateien:
  Neue Module, geänderte Module, Tests.

Datenmodell:
  Types/Interfaces.

Regeln:
  Welche Regeln aus Spec 5 werden umgesetzt?

Tests zuerst:
  Liste konkreter Tests.

Implementierung:
  Schritte in kleiner Reihenfolge.

Verifikation:
  tsc, vitest, ggf. Simulation.

Telemetrie:
  Welche Messwerte entstehen?
```

Claude soll aus dieser Spec keine große Alles-auf-einmal-Implementierung ableiten. Immer Gate für Gate.

---

## 15. MVP-Schnitt

Für den ersten echten Spieltest reicht:

1. Gate 0,
2. Gate 1,
3. Gate 2,
4. Gate 3,
5. Gate 4 mit `bombardement`,
6. Gate 5 mit Architekt/Feldherr.

Noch nicht nötig:

- alle Finisher,
- Richter,
- Alchemist,
- Systemform,
- Edikt,
- vollständige Fusion.

Der erste Test soll beantworten:

> Fühlt es sich gut an, über den Kompass ein Pol-Paar zu maxen, einen passenden Finisher zu schmieden, Gegner herzurichten, den Finisher wirksam zu zünden, ihn zu verhärten und dadurch einen neuen Grundtyp freizuschalten?

Wenn diese Frage nicht trägt, lohnt sich die Systemform noch nicht.

---

## 16. Zusammenfassung der harten Entscheidungen

- Level und Fuel sind getrennt.
- `reachedMax` ist sticky.
- Default-Basis ist 14 statt 10, wenn Ziel 7.5 Minuten bei 30 Impulsen/min ist.
- Impuls-Politik ist **umschaltbar**: Start `roh` (Dopamin), Flip auf `normalisiert` nur wenn Telemetrie/Sim es fordert (eine Funktion, kein Umbau).
- Finisher verbrauchen Fuel, nicht Level.
- Tier-2-Finisher kosten je 1 Fuel in beiden Polen.
- Verhärtung zählt nur wirksame Zündungen.
- BoardScore ist Pflicht.
- Auto-Feuer läuft über 1-Sekunden-Dispatcher.
- Blueprints haben Pity und Duplikat-Schutz.
- Tier-1-Finisher sind bei Pol-Max automatisch bekannt.
- Der erste Grundtyp ist sticky.
- Fusion bekommt Preview/Phase/Systemform, damit sie nicht zu eng an „alle drei Pole gemaxt“ klebt.
- System-Edikt hat Pulse und Budget, kein Frame-Spam.
- Umsetzung läuft Gate für Gate.
