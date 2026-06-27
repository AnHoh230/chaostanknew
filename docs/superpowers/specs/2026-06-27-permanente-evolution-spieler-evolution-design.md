# Spec 3 — Spieler-Evolution

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** Entwurf zum Review. Entscheidungen (§6) sind begründete Vorschläge — überschreibbar.
- **Hängt an:** [Spec 0](2026-06-27-permanente-evolution-fundament-design.md),
  [Spec 1](2026-06-27-permanente-evolution-kompass-konsole-design.md),
  [Spec 2](2026-06-27-permanente-evolution-finisher-design.md)
- **Liefert an:** Spec 4 (Kompass-Fusion / Systemform).

---

## 1. Wozu diese Spec

Phase 4. Hier passiert das, was dir „fast am meisten" gefällt: der Spieler hört auf, *nur* Kommander
zu sein, und wird **ein anderer Typ Kämpfer**. Nicht „Item X evolviert" — sondern eine **permanente
Verwandlung des Grundtyps**, die aussieht und sich anders spielt. Diese Spec definiert die drei
**Paar-Grundtypen**, ihren **Auslöser**, die **Verschmelzung von Q-Ult + Finisher-Ult**, den neuen
manuellen Verb und die sichtbare Transformation. Die **Systemform** (alle drei) wird hier nur
geseedet — sie ist die Fusion und gehört in Spec 4.

---

## 2. Was die Evolution ist

- **Permanenter Grundtyp-Wechsel** (für den Run), kein temporärer Buff. Der Spieler *bleibt* der neue
  Typ.
- **Verschmelzung statt Addition:** der Grundtyp ist das, was deine **Q-Ult** tat **+** was dein
  **Finisher** tat — fusioniert zur **immer-an Baseline**. Die unteren Schichten (Schuss, Q, Finisher)
  sind da längst verhärtet/automatisiert; die Evolution *bündelt* sie zu einer neuen Identität.
- **Ein neuer manueller Verb** kommt obendrauf (die Phase-4-Schicht) — alles darunter läuft auto.
- **Build-agnostisch:** welcher Grundtyp du wirst, entscheidet der **Kompass** (welches Pol-Paar du
  maxt), nicht dein Build. Der Build *färbt* nur (Spec 2c). Damit erlebt jeder der 27 Builds jeden
  Grundtyp anders → die Tiefe, die du wolltest.

---

## 3. Der Auslöser

Ein **gemeistertes Pol-Paar** löst die Evolution in *dessen* Grundtyp aus. „Gemeistert" =

1. beide Pole des Paares **gemaxt** (Spec 1), **und**
2. der zugehörige **Paar-Finisher verhärtet** (Spec 2, E8 — er feuert selbst).

Das ist dein „wenn der Spieler bestimmte Finisher oft kombiniert / Endformen erreicht". Sobald das
erste Paar gemeistert ist → **Verwandlung**. Ein **zweites** Paar zu verfolgen ist nicht ein zweiter
Typ, sondern der **Weg zur Systemform** (Spec 4).

---

## 4. Die Grundtypen (der Kern)

| Grundtyp | Paar | Neue Baseline (Q-Ult ⊕ Finisher, immer an) | Dein neuer manueller Verb | Sichtbar |
|---|---|---|---|---|
| **Architekt / Feldherr** | **B + R** | Der Panzer befehligt **mobile Feld-Artillerie**: der Auto-Schuss wird zum Befehls-Impuls, der Felder Richtung Ziel verschiebt und zünden lässt. „Zonen reagieren auf Befehle." | **Ziel-Marker setzen** → Felder/Artillerie sammeln sich dort & schlagen ein. Du dirigierst das Schlachtfeld. | Kommando-Gitter/Banner, Felder mit Fadenkreuz-Rand |
| **Alchemist / Verseucher** | **R + Z** | **Jedes Feld ist passiv ansteckend**; Verseuchte werden **Vektoren**, die die Seuche durch die Arena schleppen; Kills platzen als Sporen. Arena = selbstausbreitendes Seuchen-Netz. | **Einen Verseuchten zum Super-Vektor küren** → er zieht/streut die Seuche aktiv. Du lenkst die Ausbreitung. | tropfende Sporen, grüner Dunst, giftig pulsende Felder |
| **Richter / Manipulator** | **B + Z** | Markiert-und-verseuchte Gegner sind **Knoten**: stirbt einer, **vollstreckt er einen Befehl** (reicht Marke/Seuche weiter oder zündet den DoT der Nachbarn). Die Menge wird ein Schaltkreis. | **Einen Knoten auslösen** → die Kaskade rollt durchs Netz. Du legst Ketten und zündest sie. | Urteils-Siegel, Ketten-Linien zwischen Knoten, Waage |
| **Systemform** *(Seed → Spec 4)* | **B+R+Z** | Periodisches **System-Edikt**: für Sekunden ändern sich die *Regeln* (alle Gegner bei Spawn auto-hergerichtet, alle Finisher feuern im Loop, Zeit/Schwerkraft verzogen). Außerhalb: die drei Baselines fusioniert. | *(Spec 4)* | Arena-Verzerrung, Gitterwelt, Panzer als Leuchtkern |

Jeder Grundtyp ist **keine Schadensstufe**, sondern ein **anderes Spielverb**. Die exponentielle
Kurve (Spec 0, Stance B) hältst du nicht durch „×Schaden", sondern weil das neue Verb deinen
Durchsatz vervielfacht (Artillerie-Dirigat / Seuchen-Netz / Ketten-Vollstreckung).

---

## 5. Wie es in die Häutung passt

- **Vorher (Ende Phase 3):** Schuss, Q-Ult und Finisher sind verhärtet (auto). Hände frei.
- **Verwandlung (Phase 4):** das gemeisterte Paar fusioniert Q+Finisher zur Grundtyp-Baseline; der
  Panzer transformiert sichtbar; **ein** neuer manueller Verb erscheint.
- **Verhärtung (→ Phase 5):** ist auch dieser Verb gemeistert, verhärtet er, und die **Systemform /
  Fusion** (Spec 4) wird die nächste Schicht.

---

## 6. Entscheidungen (Vorschläge — sag, wenn anders)

| # | Entscheidung | Begründung |
|---|---|---|
| G1 | **Permanenter Grundtyp-Wechsel** (Run-Baseline), kein Buff | „du *bist* ein anderer Typ" |
| G2 | **Auslöser = ein gemeistertes Pol-Paar** (beide gemaxt + Finisher verhärtet) | knüpft sauber an Spec 1/2 |
| G3 | **Grundtyp = Verschmelzung Q-Ult ⊕ Finisher-Ult** | Spec-0-Ladder; bündelt Phase 2+3 |
| G4 | **Genau ein neuer manueller Verb** je Grundtyp | Häuten-Modell: oberste Schicht manuell, Rest auto |
| G5 | **Build-agnostisch über Kompass** (Build färbt nur) | 27 Builds × Grundtypen = Tiefe |
| G6 | **Zweites Paar = Weg zur Systemform**, kein Paralleltyp | hält die Ladder linear (Phase 5 = Fusion) |
| G7 | **Sichtbare Panzer-Transformation** je Grundtyp | „das Spiel auch visuell verändern" |

---

## 7. Pure-Modul-Skizze (`src/build/evolution.ts`, TDD)

Design-Ebene, nicht final. Pol-Typ aus `buildModell.ts`; Meilensteine aus Spec 1/2.

```ts
export type GrundTyp = 'kommander' | 'architekt' | 'alchemist' | 'richter' | 'systemform';

export interface EvolutionState {
  typ: GrundTyp;            // Start 'kommander'
  gemeistertePaare: [Pol, Pol][];
}

// Paar -> Grundtyp
export function paarTyp(a: Pol, b: Pol): Exclude<GrundTyp, 'kommander' | 'systemform'>;
// 'befehl'+'raum' -> 'architekt' | 'raum'+'zustand' -> 'alchemist' | 'befehl'+'zustand' -> 'richter'

export function createEvolutionState(): EvolutionState;
export function meisterePaar(s, a, b): void;          // Paar gemeistert (Spec 1+2 erfüllt)
export function evolviere(s): GrundTyp;               // setzt typ aus erstem gemeisterten Paar
export function istSystemformReif(s): boolean;        // >= 2 Paare gemeistert (Spec 4 / E6)
export function aktiverGrundTyp(s): GrundTyp;
```

**Testfälle (Auszug):** `paarTyp` ist reihenfolge-unabhängig (B+R == R+B → architekt); `evolviere`
setzt den Typ des ersten gemeisterten Paares; ab 2 gemeisterten Paaren `istSystemformReif`; ohne
Paar bleibt `kommander`.

---

## 8. Offene Punkte (zu klären / teils Spec 4)

- Exakte **Schwellen** des Auslösers (reicht „Finisher verhärtet", oder zusätzlich N Nutzungen?).
- **Re-Evolution:** wenn ein zweites Paar gemeistert wird, bevor Systemform reif ist — Typ wechseln
  oder sammeln? (Vorschlag: sammeln Richtung Systemform, Typ bleibt bis zur Fusion.)
- **Systemform-Regeländerungen** im Detail → Spec 4.
- **Balance** der neuen Baselines gegen die exponentielle Kurve (Playtest).
- Wie stark **der Build die Baseline färbt** (Spec 2c) auf Grundtyp-Ebene.

---

## 9. Randbedingungen

Erbt Spec 0 §10: Kommander = Ausgangsklasse, auf der die Grundtypen *aufbauen* (Stage 0 bleibt); TDD
(`evolution.ts` + `evolution.test.ts`); Verifikation `tsc` + `vitest`, keine
Browser-Selbstverifikation; Gelöschtes bleibt gelöscht.
