# Skalierende Schwarm-Welt mit stil-getriebenem Spawn — Plan

> **Für agentische Worker:** Task-für-Task, `- [ ]`. Sub-Skills: `test-driven-development`, `verification-before-completion`.

**Genre:** Vampire-Survivors-/Brotato-artiges **Schwarm-Survival** + Rogue-like-Elemente.
Das **Survival-/Run-/Aufrüst-/Meta-Gerüst** (Run-Struktur, Upgrades zwischen/in Runden, Sieg/Niederlage)
wird separat festgelegt → **OFFEN, hier nicht bauen**. Dieser Plan deckt **nur den adaptiven
Spawn-Kern** ab.

## Was das System TUT (Verhalten, kein Etikett)

- Während des Spielens wird laufend gemessen, **WIE** der Spieler spielt — 4 Richtungen:
  Auto-Turret-lastig · Einbunkern · Distanz/Sniper · Rush. *(bereits gebaut: StyleTracker)*
- Jede Richtung hat einen **Heat**-Wert. Spielt der Spieler eine Richtung, **steigt** ihr Heat
  schnell. Hört er auf, **kühlt** sie **langsam** (asymmetrisch). Folge: mehrere Richtungen
  können gleichzeitig heiß sein.
- Heat einer Richtung bestimmt, **welche Gegner-TYPEN** spawnen und **wie viele** (Schwarmgröße).
  Höherer Heat → mehr und speziellere Gegner-Typen, deren **VERHALTEN** diese Spielweise kontert
  (z. B. Sniper-Heat → schnelle Typen, die Distanz schließen / Sichtlinie brechen). Konter
  entsteht durch **Verhalten**, nicht durch an den Spieler balancierte Stats, nicht durch
  „stärkere Stufen" desselben Gegner-Typs.
- Mehrere heiße Richtungen → **gemischte Schwärme**. Wer ständig wechselt, bekommt von allem
  etwas und muss jedem Typ mit der passenden Antwort begegnen.

## Explizit RAUS (= verkapptes Leveln / passt nicht)

- KEIN „Quell-Objekt zerstören → Loot + Heat sinkt" (das ist nur Leveln anders verpackt).
- KEINE „Eskalationsstufe, die man neutralisiert".
- KEIN single-active / Commitment — **mehrere Richtungen gleichzeitig ist der Punkt**.
- KEINE Feldobjekte / Missionsziele / Sabotage / Loot-Marken / Shop-Konter als Loop.
- KEINE Gegner-STUFEN als Skalierungsachse — skaliert über **TYP + ANZAHL + VERHALTEN**.

## OFFEN (separat zu klären, nicht annehmen)

Survival-Run-Gerüst, Aufrüstung/Build, Meta-Progression, Sieg/Niederlage. Bis geklärt: nichts
darauf aufbauen.

---

## Stand aus P0–P3 (was bleibt / sich ändert)

- **P0 Löschung** — gilt (Nemesis/Alt-KI/Ökonomie weg, Gegner = schlanker Combatant + Platzhalter-Loop). ✅
- **P1 StyleTracker** — **bleibt 1:1** (genau der richtige Input: misst die 4 Richtungen pro Puls). ✅
- **P2 Director** — **Umbau** (siehe R1): pro Richtung unabhängiger Heat + **asymmetrischer Decay**;
  **kein** single-active/Commitment; Stufe steuert **Schwarm-Intensität + Typ-Auswahl** statt Feldobjekt/Ziel.
  Configs strippen: `fieldObjectId`/`objectiveText`/`lootMarkId`/`shopUnlockIds` **raus**; **Gegner-Typ-Sets pro Stufe** rein.
- **P3 Wiring** — **bleibt** (Puls misst → Heats updaten); `tickCommitment` **raus** (kein Commitment).

---

## R1 — Director-Umbau (rein, TDD)

**Files:** `src/doctrine/doctrineDirector.ts` (+ .test), `src/doctrine/doctrineConfig.ts`

- [ ] **R1.1** Pro Richtung **unabhängiger** `heat` (0..100) + `stufe` (0..3 aus Heat-Bändern). **Kein** `activeId`, **kein** `commitmentLeft`.
- [ ] **R1.2** **Asymmetrischer Decay** in `evaluate(profile)`: Richtung mit starkem Stil-Signal → Heat **+** (bis +25/Puls); Richtung ohne Signal → Heat **−** mit *kleinerer* Rate (Default −5/Puls). → genutzte Richtung heizt schnell, alte kühlt langsam.
- [ ] **R1.3** Configs strippen auf: `id`, `displayName`, `triggers`, **`enemyTypesByStufe: string[][]`** (Stufe 0..3 → welche Gegner-Typ-IDs). `fieldObject/objective/lootMark/shopUnlock` entfernen.
- [ ] **R1.4 Tests:** Sniper-Stil 3 Pulse → Sniper-Richtung Heat hoch + Stufe steigt; danach 1 Puls Rush → Rush-Heat steigt, **Sniper kühlt nur langsam** (beide noch heiß); mehrere Richtungen dürfen gleichzeitig hohe Stufe haben (kein Deckeln). tsc + grün. **Commit.**

## R2 — Gegner-Typ-Register mit Verhalten (ersetzt den Platzhalter-Loop)

**Files:** `src/enemy/enemyTypes.ts` (+ ggf. .test für reine Auswahl/Verhaltens-Parameter), `src/enemy/enemy.ts`, `src/main.ts`

- [ ] **R2.1** Typ-Register: jeder Gegner-Typ = `{ id, comp, behavior, baseStats }`. `behavior` = ein reines Bewegungs-/Angriffsmuster (z. B. `closer` schnell auf Spieler zu + Sichtlinie egal; `flanker` umkreist; `swarm` konvergiert in Masse; `disruptor` stürmt gezielt; `blocker`/`baiter` stellt sich in den Weg). Konter = Verhalten, nicht Stats.
- [ ] **R2.2** Enemy bekommt `typeId` + ein per Typ gesetztes Verhalten; der **Platzhalter-Loop wird gelöscht** und durch ein Verhaltens-Dispatch ersetzt (pro Typ sein Muster). Rein testbare Bewegungs-Mathe wo möglich.
- [ ] **R2.3 Verifikation:** je ein Typ pro Richtung sichtbar unterschiedlich (Browser). **Commit.**

## R3 — Stil-gewichteter Schwarm-Spawn (Kern)

**Files:** `src/doctrine/spawnPlan.ts` (+ .test), `src/enemy/spawner.ts`, `src/main.ts`

- [ ] **R3.1 (rein, TDD)** `planSwarm(directionStates)`: liefert (a) **Dichte/Anzahl** skaliert mit der **Summe der Heats**, (b) **Typ-Mix** gewichtet nach Heat/Stufe je Richtung (heiße Richtung → mehr ihrer Typen; Stufe wählt die Typ-Stufe-IDs aus `enemyTypesByStufe`). Mehrere heiße Richtungen → gemischter Mix.
- [ ] **R3.2** Spawner konsumiert `planSwarm` (kontinuierlicher Schwarm-Nachschub statt fixem Roster-Cap). Vampire-Survivors-Dichte.
- [ ] **R3.3 Verifikation:** Sniper-Stil → nach einigen Pulsen Schwarm aus Sniper-Konter-Typen; Stilwechsel → neue Typen mischen sich dazu, alte ebben langsam ab. **Commit.**

## R4 — Sichtbarkeit (leichtgewichtig, optional)

- [ ] **R4.1** Kleine Anzeige, **welche Richtungen gerade heiß** sind + grob welche Typen kommen. Reine **Info** (kein „provozieren", kein Loot). **Commit.**

## R5 — Abnahme

- [ ] **R5.1** Sniper spielen → Sniper-Konter-Schwarm wächst über Pulse.
- [ ] **R5.2** Stilwechsel → neue Richtung wächst, alte kühlt **langsamer** → nachweislich gemischter Schwarm.
- [ ] **R5.3** Konter spürbar über **Verhalten** (Typen bedrängen die jeweilige Spielweise), nicht über Stat-Anpassung.
- [ ] **R5.4** Politur + offene Punkte (Survival-Gerüst) in TECH-DEBT, als „wartet auf Gesamt-Design".

---

## Gesetzte Defaults (korrigierbar)

- Heat-Anstieg stark +25 / mittel +15 / Puls; **Decay −5/Puls** (asymmetrisch, deutlich langsamer als der Anstieg).
- 4 Stufen pro Richtung über Heat-Bänder (0 / 30 / 60 / 85).
- Schwarm-Dichte skaliert mit der Summe aller Richtungs-Heats.
- Frontlage-Puls weiter live per Regler (Default 40 s).

## Selbst-Review

- Kein verkapptes Leveln (kein neutralisier-Loot, keine Gegner-Stufen-Skalierung). ✓
- Mehrere Richtungen gleichzeitig möglich (kein single-active). ✓
- Konter über Verhalten, nicht Stat-Balancing. ✓
- Survival-/Rogue-like-Gerüst bewusst OFFEN gelassen. ✓
