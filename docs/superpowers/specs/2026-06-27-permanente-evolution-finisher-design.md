# Spec 2 — Finisher

- **Datum:** 2026-06-27
- **Projekt:** ChaosTankNew
- **Status:** Entwurf zum Review. Entscheidungen (§7) sind begründete Vorschläge — überschreibbar.
- **Hängt an:** [Spec 0 — Fundament](2026-06-27-permanente-evolution-fundament-design.md),
  [Spec 1 — Kompass & Ladungen](2026-06-27-permanente-evolution-kompass-konsole-design.md)
- **Liefert an:** Spec 3 (Spieler-Evolution).

> **Update (Spec 5 — Gates/Balance):** Baupläne droppen **erst ab Kompass-Freischaltung** (nicht ab Minute 0), mit Pity + Duplikatschutz; Tier-1-Finisher sind bei Pol-Max automatisch bekannt. „Treibstoff" = getrenntes `fuel` (nicht das Level). BoardScore + Verhärtung (8 wirksame Zündungen) + Auto-Feuer-Dispatcher: [Spec 5](2026-06-27-permanente-evolution-implementierungs-gates-design.md) §6–§9.

---

## 1. Wozu diese Spec

Der Finisher ist die **Haut von Phase 3** und die Auszahlung der ganzen Vision: *„ich richte mir die
Gegner her → eine Signaturaktion zündet, die schön aussieht."* Diese Spec definiert, **was ein
Finisher ist**, **wie man ihn bekommt**, **die konkrete Kombinations-Matrix** (das, was du „gut
ausgearbeitet" wolltest), den **Zünd-Loop**, den **Feel-Unterschied zur Ult** und die
**a/b/c-Evolution**.

---

## 2. Was ein Finisher ist (und wie er sich von der Ult unterscheidet)

> **Ult:** Ich greife ins System ein. *(flexibel, steuerbar, Knopf bei Bedarf)*
> **Finisher:** Das System entlädt das, was ich aufgebaut habe. *(vorbereitete Entladung)*

Ein Finisher ist **keine „+Schaden"-Fähigkeit**, sondern eine **große, choreografierte
Signaturaktion**, die den **vorbereiteten Board-State entlädt**: er zahlt die Gegner aus, die du mit
deinem Build *hergerichtet* hast.

„Hergerichtet" heißt, je nach Pol:

| Pol | hergerichteter Zustand am Gegner (existiert im Code) |
|---|---|
| **Befehl** | **markiert** (Fadenkreuz) |
| **Raum** | **gefangen / im Feld** |
| **Zustand** | **verseucht** (Gift/DoT) |

Die **Wucht des Finishers liest diesen Board-State** (mehr hergerichtete Gegner = größere Entladung).
Damit ist „erst herrichten, dann zünden" *mechanisch echt*, nicht Deko.

---

## 3. Wie man einen Finisher bekommt (Fund + Schmieden)

Zwei Bedingungen, beide nötig — das löst „gefunden (VS)" und „aus gemaxten Items" sauber zusammen:

1. **Bauplan gefunden + genommen.** Baupläne droppen **selten, ab Kompass-Freischaltung** (VS-Stil:
   *nimm-oder-warte*). Jeder Bauplan nennt seinen **Pol-Bedarf** (z. B. „Befehl + Raum"). Du hältst
   begrenzt viele (Vorschlag: **3 Finisher-Slots**) — passt ein Fund nicht zu deinem Kompass:
   nehmen & umschwenken, oder warten. *Das ist die VS-Spannung.*
2. **Pol-Bedarf gemaxt.** Die geforderten Pole müssen über die Kompass-Konsole **gemaxt** sein
   (Spec 1, `POL_MAX_LADUNGEN`).

**Bauplan + Bedarf gemaxt → der Finisher wird geschmiedet** (= aktiv). Ab dann ist er feuerbar.

---

## 4. Die Kombinations-Matrix (der Kern)

Drei Tiers nach Pol-Bedarf. Jeder Finisher entlädt *seinen* hergerichteten Zustand — keine
Schadenszahl, sondern eine Aktion. Die **Paar-Finisher (Tier 2) sind zugleich die Evotypen** aus
Spec 0 (Spec 3 liest dieselbe Pol-Paarung).

| Tier | Pol-Bedarf | Finisher | entlädt … | Evotyp (Spec 3) |
|---|---|---|---|---|
| 1 | **Befehl** | **Generalbefehl** | alle Marken zünden in einer choreografierten Salve gleichzeitig | → Befehl |
| 1 | **Raum** | **Einsturz** | alle Felder implodieren zur Mitte, reißen Gefangene zusammen & zerquetschen | → Raum |
| 1 | **Zustand** | **Seuchenausbruch** | alle aufgebauten DoT-Reste detonieren auf einen Schlag (Kettenplatzen) | → Zustand |
| 2 | **Befehl + Raum** | **Bombardement** | markierte Gegner werden in die Felder *befohlen* (gezogen) und dort von Flächen-Einschlägen zerlegt | **Architekt / Feldherr** |
| 2 | **Raum + Zustand** | **Sporenfeld** | alle Felder werden kurz zu *ansteckenden* Seuchenfeldern: Gefangene sofort max. verseucht, Seuche springt als Netz weiter, dann Detonation | **Verseucher / Alchemist** |
| 2 | **Befehl + Zustand** | **Urteil** | jede Marke zündet den DoT ihres Gegners und *reicht ihn als Befehl weiter* an die nächsten (Vollstreckungs-Kaskade) | **Richter / Manipulator** |
| 3 | **Befehl + Raum + Zustand** | **Systembruch** | das System richtet *alle* Gegner auf einmal her (markiert + gefangen + verseucht) und entlädt alles gemeinsam; ändert kurz die Arena-Regeln | → Systemform |

*MVP = diese 7. Mehr Finisher je Pol-Combo später (VS hat Dutzende) — die Matrix ist offen
erweiterbar.* **Systembruch** ist die Brücke zu Spec 3 (Systemform); Details dort.

---

## 5. Der Zünd-Loop

1. **Herrichten** — mit dem Build Gegner markieren / fangen / verseuchen (machst du eh).
2. **Konsole** — die passenden Pole maxen (Spec 1: Treibstoff *und* Meilenstein).
3. **Bauplan** — passenden Finisher gefunden + genommen.
4. **Schmieden** — Bauplan + Bedarf gemaxt → Finisher aktiv.
5. **Zünden** — Taste: verbraucht **Treibstoff** (Ladungen der Bedarfs-Pole, Spec 1 `verbrauche`),
   liest den hergerichteten Board-State, entlädt die Signaturaktion. Genug Treibstoff = feuerbar
   (kein separater Cooldown — der Treibstoff *ist* das Tor; „je nach Ladung feuert der Finisher").
6. **Verhärten** — nach Meisterschaft (Vorschlag: N Zündungen) feuert er **selbst**, sobald
   hergerichtet + Treibstoff da. Die Hand wandert zu Phase 4.

---

## 6. Evolution a / b / c

- **a) Allein (Ränge):** der Finisher levelt mit Nutzung/Fütterung — effizienter (weniger
  Treibstoff/Schuss), größere Reichweite/Wucht, mehr getroffene Gegner.
- **b) Finisher × Finisher (Kombos):** zwei aktive Finisher kurz nacheinander **verketten**. Bsp.:
  *Sporenfeld* macht Felder ansteckend → direkt *Bombardement* hinterher = es regnet auf bereits
  verseuchte Felder (Doppel-Entladung). **Zwei Paar-Finisher zusammen können den Tier-3
  *Systembruch* schmieden** — Kombinieren *ist* der Weg zur Systemform.
- **c) Über den Build (Färbung):** derselbe Finisher trägt die Textur deines Haupt-Builds. Ein
  *Bombardement* wirft in einem RRR-Run **Felder**, in einem BBB-Run **Exekutionen**, in einem
  ZZZ-Run **Seuchenwolken**. Die Late-Game-Schicht bleibt mit der Build-Identität verbunden.

---

## 7. Entscheidungen (Vorschläge — sag, wenn anders)

| # | Entscheidung | Begründung |
|---|---|---|
| E1 | **Feuern ist treibstoff-gegated, kein Extra-Cooldown** | Spec-1-D4; „je nach Ladung feuert der Finisher" |
| E2 | **Wucht liest den hergerichteten Board-State** (Marken/Gefangene/Verseuchte) | macht „herrichten → zünden" mechanisch echt |
| E3 | **3 Tiers nach Pol-Bedarf** (1 / 2 / 3 Pole gemaxt) | Eskalation + Entdeckungstiefe |
| E4 | **Paar-Finisher = Evotyp** (B+R/R+Z/B+Z) | Finisher & Evolution teilen die Pol-Paarung (Spec 3) |
| E5 | **3 Finisher-Slots** | genug für Kombos (b), nicht überladen |
| E6 | **2 Paar-Finisher kombiniert → schmieden Systembruch (T3)** | Kombinieren ist der Pfad zur Systemform |
| E7 | **Build färbt den Finisher** (Weg c) | bindet Late Game an die Build-Identität |
| E8 | **Verhärtung: nach N Zündungen Auto-Feuer** | Phasen-Übergang 3 → 4 aus Spec 0 |
| E9 | **Baupläne: seltene Drops, nimm-oder-warte, begrenzte Slots** | dein VS-Fund-Mechanismus |

---

## 8. Pure-Modul-Skizze (`src/build/finisher.ts`, TDD)

Design-Ebene, nicht final — RED→GREEN. Pol-Typ aus `buildModell.ts`, Kompass-Schnittstelle aus Spec 1.

```ts
export type FinisherId =
  | 'generalbefehl' | 'einsturz' | 'seuchenausbruch'      // Tier 1
  | 'bombardement' | 'sporenfeld' | 'urteil'              // Tier 2
  | 'systembruch';                                        // Tier 3

export interface FinisherDef {
  id: FinisherId;
  tier: 1 | 2 | 3;
  bedarf: Pol[];                 // welche Pole gemaxt sein müssen
  liest: ('mark' | 'feld' | 'gift')[]; // welchen Board-State er entlädt
  treibstoff: Partial<Record<Pol, number>>; // Verbrauch je Zündung
  name: string; text: string; icon: string;
}

export interface FinisherState {
  bauplaene: FinisherId[];       // gefunden + genommen (max SLOTS)
  aktiv: FinisherId[];           // geschmiedet (Bedarf war gemaxt)
  zuendungen: Record<FinisherId, number>; // für Verhärtung (a / E8)
}

export const FINISHER_SLOTS = 3;
export const FINISHER_AUTOFEUER_AB = 8; // Zündungen bis Verhärtung (tunbar)

export function createFinisherState(): FinisherState;
export function nimmBauplan(s, id): boolean;          // VS: take (scheitert wenn Slots voll)
export function schmiede(s, gemaxtePole): FinisherId[]; // forge alle, deren Bedarf erfüllt
export function kannFeuern(s, id, kompass): boolean;  // aktiv + genug Treibstoff
export function feuere(s, id, kompass, board): number; // verbraucht Treibstoff, Wucht aus board
export function istVerhaertet(s, id): boolean;        // zuendungen >= AUTOFEUER_AB
export function kannKombinieren(s, a, b): FinisherId | null; // b): Paar+Paar → systembruch
```

**Testfälle (Auszug):** Bauplan nehmen scheitert bei vollen Slots; `schmiede` aktiviert nur bei
erfülltem Bedarf; `feuere` scheitert ohne Treibstoff und zieht sonst korrekt ab; Wucht skaliert mit
dem Board-State; nach `AUTOFEUER_AB` Zündungen `istVerhaertet`; zwei Paar-Finisher → `systembruch`.

---

## 9. Offene Punkte (zu klären / teils Spec 3)

- Exakte **Treibstoff-Kosten** je Finisher + wie stark die **Board-Wucht** skaliert (Playtest).
- **Erster Finisher pro Combo automatisch bekannt** (Anti-Dead-End) oder rein über Baupläne?
- **Systembruch / Systemform** — die Regeländerung gehört inhaltlich in Spec 3.
- Wie **Auto-Feuer** (E8) die manuelle Zündung ablöst (komplett auto, oder manueller Override?).

---

## 10. Randbedingungen

Erbt Spec 0 §10: Kommander = Klasse; Stage 0 bleibt; TDD (`finisher.ts` + `finisher.test.ts`);
Verifikation `tsc` + `vitest`, keine Browser-Selbstverifikation; Gelöschtes bleibt gelöscht.
