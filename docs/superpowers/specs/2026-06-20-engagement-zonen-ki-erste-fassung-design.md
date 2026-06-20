# Engagement-Zonen-KI (erste Fassung) — Detail-Spec

- **Datum:** 2026-06-20 · **Status:** Entwurf zum Review
- **Art:** Subsystem-Detail-Spec. **Bewusst erste Fassung** — Feinschliff ist in
  `docs/TECH-DEBT.md` (TD-1) als Folgearbeit vermerkt.
- **Auslöser:** Gegner wirken passiv/durchschaubar; im Code verankerte Ursache:
  Sicht-, Annäherungs- und Feuer-Range sind **entkoppelt** (tote Zone 30–60, in
  der ein Gegner den Spieler kennt, aber keine Aktion punktet → er steht), und die
  Hälfte der wählbaren Aktionen erzeugt keine Bewegung. Seit der größeren
  Spawn-Area (55–130) spawnen fast alle in der toten Zone → „die stehen nur".

---

## 1. Ziel

Jede Lage erzeugt **Bewegung** — kein totes Stehen mehr, egal wo gespawnt. Die
Reichweiten werden **gekoppelt**, so dass „wann agiert die KI" konsistent ist, und
ein **Scout-Bewegungsmuster** füllt den Leerlauf (Gegner fahren los, um andere zu
entdecken, statt zu warten).

**Erfolgskriterium:** Ein bei 55–130 gespawnter Gegner ohne Ziel in Sicht fängt an
zu **scouten** und nähert sich/engagiert, sobald ein Ziel in Sicht kommt — statt
bewegungslos zu verharren. Sichtbar über ein Modus-Overlay.

---

## 2. Scope

**In Scope (erste Fassung)**
- Engagement-Zonen-Modell (Annähern → Feuern → Abstand → Fliehen) mit **gekoppelten
  Reichweiten** (Annähern springt ab Sichtweite an, nicht erst ab 30).
- **Scouten** als Default, wenn kein Ziel in Sicht.
- **Mess-Overlay:** aktueller Modus pro Gegner sichtbar.

**Out of Scope → TECH-DEBT TD-1 (Folgearbeit)**
- Motiv-spezifische Zonen (Platzhirsch stürmt kurz, Aasgeier kitet weit, …).
- **Ausweichen/Dodge-Reflex** unter Beschuss.
- Feineres Fliehen (Schwellen, Flucht-Pfade, Sichtbarkeit der Entscheidung).
- Gruppen-/Schwarm-Verhalten.
- Rolle des bestehenden Utility-/Motiv-Gehirns (wird hier für die Bewegung
  **stillgelegt**, bleibt im Code für die spätere Motiv-Tunung).

---

## 3. Verhaltens-Modell (pro Gegner, pro Frame)

Distanz `d` zum **sichtbaren** Ziel (Ziel = bestes via `pickTarget` innerhalb
Sichtweite). `fireRange` = die einstellbare Schussweite (`shotRange`), `keepDist` =
Mindestabstand, `fleeHp` = Flucht-Schwelle.

Reihenfolge der Prüfung = Priorität (oben gewinnt):

| Modus | Bedingung | Bewegung | Feuern |
|---|---|---|---|
| **scout** | kein Ziel in Sicht | entlang Scout-Richtung fahren | nein |
| **fliehen** | Ziel sichtbar · `hpFrac < fleeHp` | vom Ziel weg | ja, wenn `d ≤ fireRange` (Kiting) |
| **annähern** | Ziel sichtbar · `d > fireRange` | zum Ziel hin | nein |
| **abstand** | Ziel sichtbar · `d < keepDist` | vom Ziel weg | ja |
| **feuern** | Ziel sichtbar · `keepDist ≤ d ≤ fireRange` | halten (0) | ja |

`fleeHp` Default ≈ 0,25. Feuern generell nur bei `Ziel sichtbar && d ≤ fireRange`
(plus Feuer-Cooldown wie bisher).

Feuern generell nur, wenn `Ziel sichtbar && d ≤ fireRange` (zusätzlich Feuer-Cooldown
wie bisher). Der Turm zeigt auf das Ziel (sichtbar) bzw. in Scout-Richtung.

**Scout-Richtung:** pro Gegner ein Heading + Timer. Solange gescoutet wird, fährt er
entlang des Headings; alle ~3–5 s (Timer) wird ein **neues zufälliges Heading**
gewählt. So roamt er die Welt ab und entdeckt neue Ziele, statt zu stehen.

---

## 4. Range-Kopplung (der Kernfix)

Bisher: „Gelegenheit" nur bis 30 (`utility.ts ENGAGE_RANGE`), Sicht 60, Feuer 40 →
tote Zone 30–60. **Neu:** Der Annäherungs-Antrieb hängt allein an *Ziel sichtbar*
(via `pickTarget` innerhalb Sichtweite) **und** `d > fireRange` — keine separate
30er-Schwelle mehr. Damit ist die Kette lückenlos: **Sicht → Annähern → Feuern →
(Abstand/Fliehen)**. Die `ENGAGE_RANGE`-gestützte Utility-Wahl wird für die Bewegung
nicht mehr benutzt.

---

## 5. Prioritäts-Reihenfolge im Gegner-Loop

Unverändert oben, neu nur der letzte Block:
1. **Shop-Fahrt** (S3, `shopGoal`) — höchste Priorität.
2. **Loot-Jagd** (S4) — Beute in der Nähe, Tasche nicht voll.
3. **Engagement** (neu): Modell aus §3 — Kampf **oder** Scout.

Der neue §3-Block **ersetzt** den bisherigen Block (Utility-Aktion +
annähern/fliehen/Revier-Bewegung).

---

## 6. Architektur & Bausteine

| Modul | Datei | Aufgabe | Test |
|---|---|---|---|
| **EngagementStep** | `src/ai/engagement.ts` | reine Funktion: Lage → Modus + Bewegungsvektor + Feuer-Flag | ✓ pure (Vitest) |
| **Scout-State** | Felder auf `Enemy` (`scoutDir`, `scoutCd`) | Heading + Re-Pick-Timer | — |
| **Modus-Overlay** | `src/ui/enemyBars.ts` (erweitern) | Modus-Text pro Gegner | Browser |
| **Verdrahtung** | `src/main.ts` | §3-Block ersetzen, Scout-Timer, Overlay füttern | Browser |

**Vertrag:**
```ts
// engagement.ts
export type EngageMode = 'scout' | 'annähern' | 'feuern' | 'abstand' | 'fliehen';
export interface EngageInput {
  selfX: number; selfZ: number;
  target: { x: number; z: number; dist: number } | null; // null = kein Ziel in Sicht
  hpFrac: number;
  fireRange: number; keepDist: number; fleeHp: number;
  scoutDir: number; // aktuelles Scout-Heading (rad)
}
export interface EngageOutput {
  mode: EngageMode;
  moveX: number; moveZ: number; // normierter Bewegungsvektor (0,0 = halten)
  fire: boolean;
  faceX: number; faceZ: number; // wohin der Turm zeigt
}
export function engagementStep(i: EngageInput): EngageOutput;
```
`engagementStep` ist deterministisch (keine rng) — die Scout-Richtung kommt von
außen (main verwaltet den Timer + zufälligen Re-Pick), damit die Funktion rein bleibt.

---

## 7. Mess-Overlay

`enemyBars` zeigt zusätzlich zum Namen den **aktuellen Modus** (kleiner Text, z. B.
„scout" / „annähern" / „feuern" / „fliehen"). So sieht man pro Gegner sofort, was er
gerade tut — und kann jeden Fix verifizieren (Observability-Prinzip), statt zu raten.
Optional später per Taste abschaltbar.

---

## 8. Testplan

**Unit (Vitest, headless) — `engagement.ts`:**
- kein Ziel → `mode='scout'`, Bewegung entlang `scoutDir`, `fire=false`.
- Ziel weit (`d>fireRange`) → `annähern`, Bewegung zum Ziel, `fire=false`.
- Ziel in Range (`keepDist≤d≤fireRange`) → `feuern`, `moveX=moveZ=0`, `fire=true`.
- Ziel zu nah (`d<keepDist`) → `abstand`, Bewegung weg, `fire=true`.
- wenig HP + Ziel nah → `fliehen`, Bewegung weg.
- Feuern nie ohne Ziel / außerhalb Range.

**Browser-Verifikation:**
- Bei 55–130 gespawnter Gegner ohne Ziel → fährt (scoutet), steht nicht (Overlay
  „scout", Position ändert sich).
- Spieler in Sicht → Gegner wechselt auf „annähern", kommt näher, dann „feuern".
- Modus-Overlay zeigt die Modi live; per `__dbg` Modus/Position eines Gegners prüfbar.

**Akzeptanz:** Unit-Tests grün, `tsc` clean, keine Konsolenfehler; Browser-Beweis,
dass ein ferner Gegner scoutet/anrückt statt zu stehen.

---

## 9. Bewusst spätere Vertiefung (TECH-DEBT TD-1)

Motiv-spezifische Zonen, Dodge-Reflex, feineres Fliehen, Gruppen-Verhalten, Rolle
des Utility-Gehirns. Diese erste Fassung erfüllt nur: „die Gegner fangen wenigstens
an, etwas zu tun (inkl. Scouten), egal wo sie spawnen."
