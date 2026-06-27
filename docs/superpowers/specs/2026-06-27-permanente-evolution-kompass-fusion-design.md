# Spec 4 — Kompass-Fusion / Systemform

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** Entwurf zum Review. Entscheidungen (§6) sind begründete Vorschläge — überschreibbar.
- **Hängt an:** [Spec 0](2026-06-27-permanente-evolution-fundament-design.md),
  [Spec 1](2026-06-27-permanente-evolution-kompass-konsole-design.md),
  [Spec 2](2026-06-27-permanente-evolution-finisher-design.md),
  [Spec 3](2026-06-27-permanente-evolution-spieler-evolution-design.md)
- **Rolle:** Phase 5 — die Spitze der Ladder, bewusst nach oben **offen erweiterbar**.

---

## 1. Wozu diese Spec

Die letzte Haut. Spec 0 sagt: *„Fusion: die Pole bluten ineinander, dein Verb wird hybrid — der
Kompass wird endlich echt. Dann Apotheose: der Kommander wird etwas anderes."* Diese Spec definiert,
**was „fusionieren" konkret heißt**, wie aus den drei Grundtypen die **Systemform** wird, und wie das
**System-Edikt** die Arena-Regeln biegt (dein „verändert die Regeln der Arena für kurze Zeit").

---

## 2. Kompass-Fusion — die Pole bluten ineinander

Bis hierher hielt der Kompass B / R / Z **getrennt** (Spec 1: ein aktiver Pol). Fusion ist der Moment,
in dem die **Cross-Pol-Interaktionen der drei Paare gleichzeitig und dauerhaft** laufen — der Kompass
wird endlich das Mischpult, das immer angedacht war:

| aus Paar | Cross-Interaktion (jetzt permanent) |
|---|---|
| B → R | **Marken befehligen Felder** (Architekt) |
| R → Z | **Felder tragen Seuche weiter** (Alchemist) |
| Z → B | **Seuche kaskadiert über Marken** (Richter) |

**Alle drei zugleich** = ein vollverdrahtetes Kriegssystem: *ein* Gegner kann markiert + gefangen +
verseucht sein, und jede Interaktion feuert — die Marke befehligt das Feld, in dem er steckt, das
Feld verteilt seine Seuche, die Seuche kaskadiert zum nächsten markierten Knoten. Selbsterhaltend.
Das ist der **hybride Verb**: du spielst nicht mehr einen Pol, sondern ihr Zusammenspiel.

---

## 3. Der Weg zur Systemform (Sub-Progression in Phase 5)

- **Fusion beginnt:** ≥ 2 Paare gemeistert (Spec 3 `istSystemformReif`). Die Cross-Interaktionen
  compounden; du bist „zwischen" den Typen.
- **Systemform erreicht:** **alle drei Pole gemaxt** (Spec 1) **+ Systembruch geschmiedet**
  (Spec 2, T3 / E6 über zwei kombinierte Paar-Finisher).

Systemform ist der **Apex** — in starken Runs erreichbar, nicht garantiert jeden Run (alle drei Pole
zu maxen ist teuer; das ist die VS-mäßige Krönung). Die häufigere Phase-5-Stufe ist die **Fusion**
selbst (≥ 2 Paare).

---

## 4. Systemform & das System-Edikt (der Apex)

Die Systemform-Signatur ist das **System-Edikt**: ein periodisches Fenster, in dem für ein paar
Sekunden die **Regeln der Arena** kippen — *zu deinen Gunsten*. Hier passieren die „Milliarden"
(Spec 0, Stance B: Zahlen als Entladung, nicht als Textur).

**Edikt-Regeln während des Fensters (Liste, tunbar):**

1. **Auto-Herrichten:** jeder Gegner ist bei Spawn sofort markiert **+** gefangen **+** verseucht —
   das System richtet für dich her.
2. **Finisher-Loop:** alle aktiven Finisher feuern wiederholt, solange das Fenster offen ist.
3. **Raum-/Zeit-Verzug:** Gegner in Zeitlupe und/oder alles zu den Feldern gezogen (eine Regel, im
   Playtest gewählt).

**Außerhalb des Fensters:** die volle fusionierte Baseline (§2) läuft weiter.

**Manueller Verb (Phase-5-Schicht):** das **Edikt invozieren / zielen** — du entscheidest, *wann* und
*wo* du die Regeln biegst. Verhärtet später zu **Auto-Loop** (das Edikt zündet selbst auf Takt).

---

## 5. Apotheose (Identität + Bild)

Der Kommander ist am Ende **kein Panzer-Kommandant** mehr, sondern die **Betriebsschicht der Arena**
— ein Regel-Setzer. Sichtbar: der Panzer löst sich in einen **Kommando-Kern** auf, die Arena
**gittert** sich um ihn herum. „Der Kommander wird etwas anderes." Das ist die visuelle Krönung der
Vision „das Spiel auch visuell verändern".

---

## 6. Entscheidungen (Vorschläge — sag, wenn anders)

| # | Entscheidung | Begründung |
|---|---|---|
| F1 | **Fusion = alle drei Cross-Pol-Interaktionen zugleich** (Grundtypen verschmolzen) | „Pole bluten ineinander"; Kompass wird echt |
| F2 | **Sub-Progression:** ≥2 Paare → Fusion; 3 Pole gemaxt + Systembruch → Systemform | knüpft an Spec 1/2/3 |
| F3 | **Systemform-Signatur = System-Edikt** (periodische Regeländerung) | dein „verändert die Regeln der Arena" |
| F4 | **Edikt-Regeln:** Auto-Herrichten, Finisher-Loop, Zeit/Raum-Verzug | konkretes, tunbares Regelset |
| F5 | **Manuell Edikt invozieren/zielen → verhärtet zu Auto-Loop** | Häuten-Modell, oberste Schicht |
| F6 | **Apotheose: Panzer → Kommando-Kern**, Arena gittert | sichtbare Krönung |
| F7 | **MVP-Decke; Ladder nach oben offen** | Spec 0: „nach Belieben erweiterbar" |

---

## 7. Pure-Modul-Skizze (Erweiterung `evolution.ts` / neu `fusion.ts`, TDD)

Design-Ebene. Baut auf `EvolutionState` (Spec 3) auf.

```ts
export interface EdiktState {
  systemform: boolean;     // alle 3 Pole gemaxt + systembruch geschmiedet
  fenster: number;         // s verbleibend (0 = zu)
  cd: number;              // s bis zum nächsten Auto-Edikt (nach Verhärtung)
}

export const EDIKT_DAUER = 6;        // s offen (tunbar)
export const EDIKT_CD = 30;          // s zwischen Auto-Edikten (tunbar)

export function fusionAktiv(evo): boolean;            // >= 2 Paare gemeistert (Spec 3)
export function systemformReif(evo, kompass, fin): boolean; // 3 Pole gemaxt + systembruch aktiv
export function invoziere(s: EdiktState): boolean;    // manuell öffnen (vor Verhärtung)
export function tickEdikt(s: EdiktState, dt): void;   // Fenster/CD herunterzählen, Auto-Loop
export function ediktOffen(s: EdiktState): boolean;
```

**Testfälle (Auszug):** `fusionAktiv` erst ab 2 gemeisterten Paaren; `systemformReif` nur mit 3
gemaxten Polen **und** geschmiedetem Systembruch; `invoziere` öffnet das Fenster nur wenn zu;
`tickEdikt` schließt nach `EDIKT_DAUER` und öffnet nach Verhärtung wieder nach `EDIKT_CD`.

---

## 8. Offene Punkte

- **Edikt-Frequenz/Dauer** und welche der Zeit/Raum-Verzug-Regeln (F4.3) sich gut anfühlt — Playtest.
- Ist Systemform in einem 20–40-min-Run **realistisch erreichbar**, oder bewusst „nur beste Runs"?
  (Pacing-Frage; hängt an Spec-1-Kosten.)
- **Was oben drauf** kommt (post-MVP): mehrere Edikt-Varianten, 6. Haut, Meta-Progression über Runs?
- Interaktion der **fusionierten Baseline mit der exponentiellen Kurve** (Balance).

---

## 9. Randbedingungen

Erbt Spec 0 §10: Kommander = Ausgangsklasse, auf der alles aufbaut (Stage 0 bleibt); TDD
(`fusion.ts`/`evolution.ts` + Tests); Verifikation `tsc` + `vitest`, keine Browser-Selbstverifikation;
Gelöschtes bleibt gelöscht.

---

## 10. Der Stapel ist komplett

Mit Spec 4 ist die **Verdauungskette** aus Spec 0 ganz beschrieben:

> Build → Skillbaum → **Kompass-Ladungen (1)** → **Finisher (2)** → **Spieler-Evolution (3)** →
> **Fusion / Systemform (4)**.

Nächster Schritt ist **Umsetzung**: Implementierungsplan für **Spec 1 (Kompass)** als erstes
baubares Modul (es liefert die Schnittstellen, auf denen 2–4 sitzen), dann TDD.
