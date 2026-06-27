# Spec 0 — Fundament: Permanente Evolution (Core-Loop & Häutungs-Modell)

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** Architektur abgenommen (Stance B + Zerlegung). Detail-Specs (1–4) folgen.
- **Rolle:** Diese Spec ist die **einzige Stelle**, an der die Gesamt-Architektur steht. Die
  Subsystem-Specs verfeinern je einen Teil und referenzieren hierher.

---

## 1. Wozu diese Spec

Das Spiel hat Loop, drei Builds (B/Z/R) und Skillbäume — aber zu wenig **Spieltiefe** und **kein
Late Game**. Diese Spec legt das Fundament für eine neue tragende Säule: **Permanente Evolution**.
Sie entscheidet den **Core-Loop** und das **Häutungs-Modell**, auf dem alle weiteren Teile
(Kompass, Finisher, Spieler-Evolution, Fusion) sitzen. Deren Detail-Mechaniken sind je eine eigene
Spec (siehe §8).

---

## 2. Vision (der Nordstern)

Das Spiel **bringt sich selbst immer wieder neu bei.** Nicht „mehr Waffen" wie Vampire Survivors —
sondern alle 5–10 Minuten kommt eine **neue Schicht Verb** online, die die alten *umdeutet*. Pro Run
entdeckt, kombiniert und verändert der Spieler etwas Neues — auch sichtbar.

Der Bogen jedes Runs:

> weg von **„ich schieße / dote / lege Feld"** (Aufbau)
> hin zu **„ich richte mir die Gegner her → ein Finisher zündet"** (Auszahlung)
> und schließlich **„ich bin ein anderer Typ Kämpfer geworden"** (Evolution).

VS-DNA bleibt: pro Run was Neues finden, Teile kombinieren, das Bild verändern. Der Unterschied zu
VS: hier wächst nicht die *Menge* an Waffen, sondern die *Tiefe* an Verben — jede Schicht rahmt die
vorige neu ein.

---

## 3. Core-Loop-Entscheidung (Stance B)

**Frage war:** Bleiben wir bei unendlichem Spawn + exponentiellem Wachstum und bauen die Evolution
einfach als Schadens-Plus oben drauf (→ am Ende Milliarden-Zahlen spammen)?

**Entscheidung: B — exponentiell als UHR, Evolution qualitativ.**

- **Gegner skalieren exponentiell** (Spawn-Dichte + HP). Das ist der **Druck**, der den Spieler zum
  Häuten *zwingt*, und der **Takt** der 5–10-min-Phasen. Auch der Zahlen-Dopamin lebt hier: die
  Zahlen klettern echt in die Milliarden.
- **Die Spieler-Evolution ist qualitativ**, nicht ein flacher Schadens-Multiplikator: sie ändert
  *was* der Spieler tut (neue Verben, Regel-Änderungen, „Systemform"). Diese qualitativen Sprünge
  sind *zugleich* riesige Durchsatz-Multiplikatoren — deshalb hält der Spieler mit der Kurve mit.
- **Die Milliarden passieren** — aber als **Finisher-/Systemform-Entladung** (Belohnung fürs
  Herrichten), nicht als Dauerfeuer-Textur.

**Warum nicht reines VS (A):** dort wird das Late Game zum entscheidungsfreien Autopilot — das
*widerspricht* der „herrichten → zünden"-Vision. Die exponentielle Kurve ist nicht der Feind der
Tiefe, sie ist die **Uhr**, die jede Häutung erzwingt und taktet. Damit werden Core-Loop, Pacing und
Evolution *eine* Maschine.

---

## 4. Das Häutungs-/Verhärtungs-Modell (die neue Kernmechanik)

- **Stapeln in Kraft, häuten in Aufmerksamkeit.** Alle gemeisterten Schichten *laufen weiter*
  (Kraft + Bild wachsen), aber der Spieler **bedient immer nur die oberste, frische Schicht**. APM
  bleibt flach, Tiefe steigt.
- **Verhärten = Automatisierung bei Phasen-Abschluss.** Ist eine Phase „voll", **verhärtet** ihre
  Mechanik und läuft selbst: Felder legen sich selbst, Ults zünden selbst, Finisher zünden selbst.
  Die Hände wandern zur nächsten Schicht.
- **Verdauungskette (Überlauf füttert das nächste Maul).** Jeder Abschnitt frisst den *Überschuss*
  des vorigen:
  - Build voll → Überlauf-Impulse füttern den Skillbaum.
  - Skillbaum voll → schaltet die **Kompass-Konsole** frei.
  - Kompass-Ladungen → füttern die **Finisher**.
  - Finisher-Meisterschaft → füttert die **Spieler-Evolution**.
  - Evolution → füttert die nächste Häutung (Fusion …).
  - Folge: „Was tu ich nach 100 %?" ist **nie** offen — der Überlauf hat immer ein nächstes Maul.

---

## 5. Pacing

- **Ziel:** ~5–10 min je Phase.
- **Ist-Stand:** Build + Skillbaum zusammen ≈ 6–7 min — also faktisch **eine** Phase.
- **Folge:** für 20–40 min/Run brauchen wir **5 Häute** (die Kompass-Fusion wird damit eine *echte*
  Phase, kein Anhängsel).
- **Die Füllrate je Phase IST der zentrale Balance-Regler.** Statt „Level vs. Spawn" im Blindflug zu
  tunen, tunen wir „wie lange dauert Häutung N". Das gibt der bisher unausgegorenen Balance einen
  klaren Angriffspunkt.
- Re-Pacing der bestehenden Build/Skillbaum-Phase(n) ist Teil der Umsetzung.

---

## 6. Die 5-Häute-Ladder

| # | Haut (Phase) | Du bedienst (manuell) | Verhärtet zu (auto) | Gefüttert durch |
|---|---|---|---|---|
| 1 | **Build** | Schuss → Verb (markieren / verseuchen / Feld) | Verb läuft selbst | Impulse (Kills) |
| 2 | **Ult (Q)** | Ult-Rhythmus um Q | Q zündet selbst | Skillpunkte |
| 3 | **Finisher-Ult** | herrichten → Finisher zünden | Finisher zündet selbst | Kompass-Ladungen + gefundene Baupläne |
| 4 | **Spieler-Evolution** | neuer Grundmodus (Pol-Paar-Typ) | *ist* der neue Baseline | gemaxte Pol-Paare |
| 5 | **Kompass-Fusion** | eigene Planphase (§8, Spec 4) | — | zu definieren |

*Hinweis:* ob Haut 1+2 (Build/Ult) im Pacing zu **einer** Phase verschmelzen oder getrennt mit
neu-getakteten Füllraten bleiben, klärt die Umsetzung (offener Punkt §9).

---

## 7. Der rote Faden — der Kompass IST die Maschine

Der Kompass zieht sich als roter Faden durch alle Phasen und löst die bisherigen Ungereimtheiten
(„Ladungen" vs. „Items" vs. „gefundene Finisher") auf:

- **3 Pole = 3 „Items"** (Befehl / Raum / Zustand). **Ladungen = ihre Level.** Die Konsole schaltet
  nach vollem Skillbaum frei und nimmt den Impuls-Überlauf auf.
- Ein **gemaxtes Pol-PAAR** erzeugt **zwei Dinge auf einmal** — den **Finisher** *und* den
  **Evolutionstyp**:
  - **Befehl + Raum** → Architekt / Feldherr
  - **Raum + Zustand** → Verseucher / Alchemist
  - **Befehl + Zustand** → Richter / Manipulator
- **Alle drei gemaxt → Systemform** (verändert für kurze Zeit die *Regeln der Arena*, nicht nur den
  Schaden).
- **Gefundene Finisher sind Baupläne** (selten, ab Minute 0, VS „nimm-oder-warte"): sie nennen die
  nötige Pol-Kombi (z. B. „Raum-max + Zustand-max"). Passt ein Fund nicht zum eigenen Kompass →
  nehmen und umschwenken, oder warten. Das *ist* die VS-Spannung.
- **Ult vs. Finisher — der Feel-Unterschied (wörtlich, Nutzer):**
  > **Ult:** Ich greife ins System ein. *(flexibel, steuerbar)*
  > **Finisher:** Das System entlädt das, was ich aufgebaut habe. *(vorbereitete Entladung)*

---

## 8. Zerlegung / Spec-Stapel

Zu groß für eine Spec. Stapel in Reihenfolge, jede mit eigenem **Spec → Plan → Bau**-Zyklus:

| Spec | Inhalt | Hängt an |
|---|---|---|
| **0 — Fundament** *(diese)* | Core-Loop (B), Häutung/Verhärtung, Pacing, 5-Häute-Ladder, roter Faden | — |
| **1 — Kompass-Konsole & Ladungen** | Freischaltung, Pol-Items, Ladungs-Ökonomie, Überlauf-Einspeisung | 0 |
| **2 — Finisher** | Baupläne, Fund/Auswahl (VS), Pol-Kombi → Wirkung, Feel-vs-Ult, Auto-Zündung, Evolution a/b/c | 1 |
| **3 — Spieler-Evolution** | Pol-Paar-Typen, Systemform, Auslöser, visuelle + mechanische Transformation | 2 |
| **4 — Kompass-Fusion** | eigene Planphase: was „fusioniert", wie es aussieht/spielt | 3 |

**Finisher-Seed (Detail → Spec 2):** Finisher entstehen aus gemaxten Items / Item-Kombinationen
(Bsp.: Raum-max + Zustand-max = *verseuchter Flächen-Finisher*). Kein „mehr Schaden", sondern große
**Signaturaktion**. Evolution über **a)** sich allein (Ränge), **b)** Finisher × Finisher (Kombos),
**c)** den Build (B/Z/R färben denselben Finisher).

**Evolution-Seed (Detail → Spec 3):** Wenn der Spieler bestimmte Ults/Finisher oft kombiniert oder
Endformen erreicht, ändert sich **der Spieler selbst** — nicht „Item X evolviert", sondern „du bist
ein anderer Typ Kämpfer geworden". Je nach Build + Ult + Finisher entsteht ein **neuer Grundtyp**
(nicht mehr nur Kommander — er evolviert selbst).

---

## 9. Offene Punkte (in den Detail-Specs zu klären)

- Verschmelzen Haut 1+2 (Build/Ult) zu einer Phase, oder getrennt mit neu-getakteten Füllraten?
- Manueller **Override** auf verhärtete Schichten (z. B. ein Feld bewusst selbst setzen) — ja/nein,
  wie?
- Genaue **Ladungs-Ökonomie**: 1 Ladung pro 100 %-Pass oder skaliert? Beim Finisher-Zünden
  **Verbrauch** der Ladungen oder **Schwelle** halten?
- Wie viele **Finisher-Baupläne** gleichzeitig? Wie greifen die Kombos (Weg b) konkret?
- Exakte **Auslöser** der Spieler-Evolution (Schwellen, „oft kombiniert"?).
- Was **Kompass-Fusion** konkret ist (Spec 4).

---

## 10. Randbedingungen (Invarianten — nicht verhandelbar)

- **Kommander IST die Klasse** (Code-Name `sniper`); B/Z/R sind **Builds**, keine Klassen. Die
  Spieler-Evolution macht den Spieler zu einem neuen **Grundtyp** — die erste echte Erweiterung über
  den Kommander hinaus, aber *aufbauend* auf ihm.
- **Stage 0 = blanker Kommander-Schuss** (Klassen-Baseline) bleibt erhalten.
- **TDD:** reine Logik in `src/build/*.ts` mit `*.test.ts` (RED → GREEN).
- **Verifikation** via `tsc` + `vitest`; **keine Browser-Selbstverifikation** (den Spiel-Feel testet
  der Nutzer).
- Bereits **Gelöschtes bleibt gelöscht** (flowState / respawn-grace).

---

## 11. Auswirkungen auf bestehenden Code (Orientierung, kein Detail)

- `src/evolution/channels.ts` — die Pol-Kanäle werden zur Kompass-Maschine erweitert
  (Überlauf/Ladungen).
- Skillbäume (`befehlSkill` / `raumSkill` / …) — bekommen den „Verhärten"-Hook (Auto-Auslösung) und
  ein Endgame (Konsole nach 100 %).
- `src/main.ts` — Phasen-Zustandsmaschine (welche Schicht ist aktiv / verhärtet) + die
  Automatisierungs-Hooks.
- `src/enemy/spawner.ts` + Balance — die exponentielle Kurve als „Uhr"; Tuning über die Phasendauer.
- **Neue reine Module (TDD), voraussichtlich:** `build/phasen.ts` (Häutungs-Zustand),
  `build/kompass.ts` (Ladungen), `build/finisher.ts` (Baupläne/Kombis).
