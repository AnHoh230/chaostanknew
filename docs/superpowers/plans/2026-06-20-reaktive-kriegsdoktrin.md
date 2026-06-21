# Reaktive Kriegsdoktrin — Implementierungs- & Umbauplan

> **Für agentische Worker:** Umsetzung Task-für-Task, Schritte als `- [ ]`.
> Sub-Skills: `superpowers:test-driven-development` (reine Module), `superpowers:verification-before-completion`.

**Quelle:** `C:\Users\An_ho\Downloads\panzer-mvp-reaktive-kriegsdoktrin.md` (Spec)
**Ziel:** Das Nemesis-/Promotions-System wird **gelöscht** und durch ein **reaktives
Kriegsdoktrin-System** ersetzt: Die Welt liest den Spielstil, baut sichtbare Gegen-Doktrinen
auf und verändert Spawns, Arena-Objekte, Ziele, Loot und Shop — **ohne** einzelnen Gegner mit
Gedächtnis (patent-sicher).

**Architektur:** Ein **daten-getriebenes** Doktrin-System (`DoctrineConfig[]` + generische
Engine). Die 4 Doktrinen sind 4 Konfig-Datensätze, die *dieselbe* Engine konsumiert →
garantiert konsistent (kein „jede Doktrin anders gebaut"). Reine Logik (Tracker, Director) ist
voll unit-getestet; In-Welt-Teile (Gegner, Objekte, Effekte, UI) hängen an den vorhandenen
Systemen (Spawner, combat, buffs, pickups, shop, Toast/Marker).

**Tech Stack:** TypeScript strict ESM, Vitest, Babylon.js.

---

## Adaptierte Designentscheidungen (Spec → dieses Spiel)

Das Spiel ist eine **durchgehende Echtzeit-Arena**, kein Run/Missions-Spiel. Daraus folgt:

| Spec-Annahme | Adaption in diesem Spiel |
|---|---|
| Bewertung „nach Einsatz/Welle" | **Frontlage-Puls**: rollierendes Auswertungsfenster, Länge **live per Schieberegler** (Default 40 s) |
| `commitmentLeft` in Einsätzen | in **Pulsen** (Default 2 Pulse) |
| Basis/Garage Frontlage-Panel | **In-Welt-Frontlage-HUD**, Toggle-Taste `F` |
| Nach-dem-Einsatz-Auswertung | **Stage-Wechsel-Update** (Banner + Eintrag im Frontlage-HUD) |
| Materialien + Crafting | **Doktrin-Teile = Freischalt-Marken** über das vorhandene Item/Loot-System (kein Crafting) |
| Save/Load zwischen Einsätzen | **gestrichen** — Doktrin-Zustand lebt nur in der Session |
| clean-vs-brutal Harvest / `overkillRatio` | **gestrichen** (kein Teil-für-Teil-System) |
| `turretsPlaced` / Turrets platzieren | **gestrichen** → Signal = **Auto-Turret-Schadensanteil** |
| Dash/Boost | **Booster-Nutzung** (Gürtel) |
| Mission-Objektiv | **zerstörbares Quell-Objekt in der Arena** (kein Missionssystem) |

Player-facing-Texte nach §20 (kein „Heat/Doctrine/Director" sichtbar; „Frontlage/Feindlicher Fokus").

---

## Dateistruktur

**Neu:**
- `src/doctrine/styleProfile.ts` (+ .test) — PlayerStyleProfile-Typ + reine Aggregation
- `src/doctrine/styleTracker.ts` (+ .test) — sammelt Events → Profil über das Puls-Fenster
- `src/doctrine/doctrineConfig.ts` — Typen + die **4 Doktrin-Konfigs** (Daten)
- `src/doctrine/doctrineDirector.ts` (+ .test) — Heat/Stage/Commitment (rein)
- `src/doctrine/spawnModifier.ts` (+ .test) — Spawn-Mischung pro Stage (rein)
- `src/doctrine/lootMarks.ts` (+ .test) — Doktrin-Marken + Shop-Freischalt-Gates (rein)
- `src/doctrine/enemyTemplates.ts` — Baurezepte der Doktrin-Gegner (Comp + Stats + Rolle)
- `src/doctrine/fieldObjects.ts` — Quell-/Feldobjekte (Mesh + Effekt + Zerstör-Hook)
- `src/doctrine/effects.ts` (+ .test) — reine Effekt-Mathematik (Störzone, Artillerie-Warnung, Rauch, Mine)
- `src/ui/frontlageHud.ts` — Frontlage-Panel (Taste F) + Provokations-Button
- `src/ui/doctrineBanner.ts` — Kampf-Banner + Frontmeldungen + Zielmarker

**Geändert:**
- `src/main.ts` — Verdrahtung (Puls, Event-Hooks, Spawn-Mod, Objekt-Spawn, UI), Regler-Umbau
- `src/enemy/spawner.ts` — akzeptiert Doktrin-Spawn-Anforderungen
- `src/shop/catalog.ts` / `shop.ts` — Doktrin-Konter-Items + Freischalt-Gate
- `src/ui/cameraPanel.ts` — Regler bereinigen + Frontlage-Puls-Regler

**Gelöscht (Phase 0):** `src/named/` (promotion, revealText, akte + Tests), `src/reveal/` + alle Referenzen.

---

## Phase 0 — Demolition + Strip auf schlanke Basis

> **Prinzip (Nutzer):** Aus dem *aktuellen Stand* löschen, keine Deaktivierung + Fallbacks.
> Git behält die Historie. Auch das Platzhalter-Verhalten ist **inline & minimal** und wird
> in P5 **gelöscht** (kein inaktiver Legacy-Code).

**Voller Lösch-Umfang (bestätigt):**
- **Nemesis:** `named/` (promotion, revealText, akte), `reveal/` + Referenzen (named/respawnTimer/prevTargetVisible/akteBuch/smite/reveal/„named=rot").
- **Alt-KI & Persönlichkeiten:** `ai/enemyBrain.ts`, `ai/utility.ts`, `ai/aiTypes.ts`, `ai/motives.ts`, `ai/engagement.ts`, `enemy/targeting.ts` (+ alle Tests).
- **Gegner-Selbst-Ökonomie:** `enemy/enemyEconomy.ts` (+test); Enemy-Felder `prog/credits/shopState/dwellTimer/shopGoal/beltCd/belt/overShots/overMul/autoTurretCd/scoutDir/scoutCd/mode/brain/traits/action/motiveId/spawnInvulnCd`; in `main.ts` Shop-Trip-State-Machine, Gegner-Booster-KI, Kill→XP/Credits, Engagement/Targeting/Ökonomie-Block, Fraktions-Kampf.
- **Veraltete Regler:** „Max Gegner", „Spawn-Intervall" (+ `__tune`-Getter/Setter).

**Bestätigte Design-Schnitte:** Gegner bekämpfen sich NICHT mehr (alle `team:'enemy'`, zielen nur auf Spieler); Gegner-Stats kommen aus per Spawn zugewiesenem Gear (`rollEnemyEquipment` + `enemyCombatStats`), kein XP/MK-Selbstaufstieg.

**Bleibt (generisch):** `combat/` (combat, projectilePool, projectileView, buffs, accuracy, autoTurret, areaTargeting, hitMath) · `enemy/enemyStats.ts` + `equipment.ts` · `spawner.ts` (vereinfacht, ohne Motive) · `enemy.ts` schlank · Spieler/Shop/Inventar/Loot/Welt/Kamera. **`enemy.buffs` bleibt** (passiver Empfänger der Spieler-Debuffs Zielmarkierung/Rauch → `combatant.incomingMul`).

**Schlanker Enemy:** `{ id, view, combatant(team:'enemy'), equipment, damage, fireCd, displayName, level, buffs }`.

**Platzhalter-Verhalten (inline im Loop, P5 löscht es):** auf Spieler zufahren → in Reichweite feuern → `buffs.tick` + `combatant.incomingMul` setzen → bei Tod Loot droppen + Spieler-Reward.

**Files:**
- Delete: `src/named/promotion.ts` `src/named/promotion.test.ts` `src/named/revealText.ts` `src/named/revealText.test.ts` `src/named/akte.ts` `src/named/akte.test.ts` `src/reveal/reveal.ts`
- Modify: `src/enemy/enemy.ts`, `src/main.ts`, `src/ui/enemyBars.ts`, `src/inspect/enemyInfo.ts` (+ .test), `src/ui/inspectCard.ts`, `src/ui/overviewMap.ts`, `src/ui/minimap.ts`, `src/ui/cameraPanel.ts`

- [ ] **Step 1: Referenzen final kartieren.** Run: `cd ChaosTankNew && npx grep -rn "named\|Named\|reveal\|Reveal\|akte\|Akte\|promotion\|Promotion\|respawnTimer\|prevTargetVisible\|Recognition\|smite" src` (oder Grep-Tool). Liste abhaken gegen die Modify-Liste oben. `displayName` (= „Panzer N") ist **kein** Nemesis → bleibt.
- [ ] **Step 2: `git rm` der Nemesis-Dateien** (siehe Delete-Liste).
- [ ] **Step 3: `enemy.ts` bereinigen** — Felder `named`, `respawnTimer`, `prevTargetVisible` + zugehörige Importe (`Named`) entfernen. `displayName` bleibt (generischer „Panzer N"-Name).
- [ ] **Step 4: `main.ts` bereinigen** — entfernen: `akteBuch`, `createReveal`/Reveal-Aufrufe, Promotion-Verdrahtung, `NAMED_RESPAWN`, der Named-Respawn-Zweig im Gegner-Loop, `__dbg.smite`, alle `e.named`/`e.respawnTimer`-Lesungen (Gegner werden schlicht entfernt statt „kehren zurück").
- [ ] **Step 5: UI bereinigen** — `enemyBars`: `isNamed`-Sonderfarbe raus (alle Gegner gleich gefärbt). `inspectCard`/`enemyInfo`: `archetyp` + `history`/Akte-Sektion raus. `overviewMap`/`minimap`: „named=rot"-Sonderpunkt raus (einheitliche Gegner-Punkte).
- [ ] **Step 6: Veraltete Regler löschen** — in `cameraPanel.ts` die Slider **„Max Gegner"** und **„Spawn-Intervall"** entfernen; in `main.ts` die `__tune`-Getter/Setter `getMaxEnemies/setMaxEnemies/getSpawnInterval/setSpawnInterval` entfernen; Spawner mit festen Defaults (maxAlive, interval) weiterlaufen lassen (Dichte steuert künftig die Doktrin/der Puls). **Bleibt:** Kamera (Höhe/Distanz/Zoom), Schussweite.
- [ ] **Step 7: tsc + Tests grün.** Run: `cd ChaosTankNew && npx tsc --noEmit && npx vitest run`. Erwartet: keine Referenz-Fehler mehr, alle verbliebenen Tests grün (Nemesis-Tests sind mitgelöscht).
- [ ] **Step 8: Browser-Rauchtest** — Spiel startet, Gegner spawnen/kämpfen/sterben *ohne* Wiederkehr/Promotion, keine Konsolenfehler. **Commit:** `Phase 0: Nemesis/Promotion-Schicht + veraltete Spawn-Regler geloescht`.

---

## Phase 1 — PlayerStyleProfile + StyleTracker (rein, TDD)

**Files:** Create `src/doctrine/styleProfile.ts` (+ .test), `src/doctrine/styleTracker.ts` (+ .test)

`PlayerStyleProfile` (alle Ratios 0..1, über das aktuelle Puls-Fenster):

```ts
export interface PlayerStyleProfile {
  autoTurretDamageRatio: number; // Anteil Spielerschaden aus der Sekundärwaffe
  stationaryRatio: number;       // Anteil Frames unter Bewegungs-Schwelle
  timeInSameArea: number;        // Sekunden im Umkreis des Bewegungs-Ankers
  longRangeKillRatio: number;    // Kills jenseits LONG_DIST
  closeRangeKillRatio: number;   // Kills innerhalb CLOSE_DIST
  avgSpeed: number;              // Welt-Einheiten/s
  boosterUsage: number;          // gezündete Booster im Fenster
  damageTakenWhileStationary: number;
}
```

- [ ] **T1.1 styleTracker (TDD).** `createStyleTracker()` mit Methoden:
  `onDamageDealt({amount, fromAutoTurret})`, `onKill({dist})`, `onMove({speed, x, z, dt})`,
  `onDamageTaken({amount, stationary})`, `onBoosterUsed()`, und `snapshotAndReset(): PlayerStyleProfile`.
  Tests: nur Auto-Turret-Schaden → `autoTurretDamageRatio≈1`; nur Fernkills → `longRangeKillRatio≈1`;
  langes Stehen → hoher `stationaryRatio` + `timeInSameArea`; `snapshotAndReset` leert das Fenster.
  Konstanten: `LONG_DIST=28`, `CLOSE_DIST=10`, `STATIONARY_SPEED=1.5`, `SAME_AREA_RADIUS=12`.
- [ ] **T1.2** tsc + Test grün. **Commit:** `feat(doctrine): PlayerStyleProfile + StyleTracker (rein, TDD)`.

---

## Phase 2 — DoctrineConfig + DoctrineDirector (rein, TDD)

**Files:** Create `src/doctrine/doctrineConfig.ts`, `src/doctrine/doctrineDirector.ts` (+ .test)

`DoctrineConfig` (Daten — Felder, alle 4 Doktrinen liefern diese):

```ts
export type DoctrineStage = 'inactive' | 'hint' | 'preparing' | 'active' | 'escalated';
export interface DoctrineTrigger { field: keyof PlayerStyleProfile; mid: number; strong: number; }
export interface DoctrineConfig {
  id: string;
  displayName: string;          // „Störkrieg"
  playerReason: string;         // Frontlage-Erklärung
  triggers: DoctrineTrigger[];  // welche Stil-Werte Hitze erzeugen
  enemyTemplateIds: string[];   // Doktrin-Gegner (Phase 5)
  fieldObjectId: string;        // Quell-Objekt (Phase 5)
  objectiveText: string;        // „Zerstöre das Signal-Relay"
  lootMarkId: string;           // Freischalt-Marke (Phase 6)
  shopUnlockIds: string[];      // Konter-Items (Phase 6)
}
```

Schwellen/Heat-Regeln als Konstanten (Spec §23): `HINT=25, PREPARE=50, ACTIVE=75, ESCALATED=90`,
`HEAT_STRONG=+25, MID=+15, LIGHT=+8, DECAY=-10, SABOTAGE=-30, PROVOKE=+25`, `COMMITMENT=2`, Heat ∈ [0,100].

`DoctrineDirector` (rein):
- `evaluate(profile, configs)` — pro Doktrin Score aus Triggern (strong/mid/light/decay) → Heat anpassen.
- Stage aus Heat (Schwellen). Genau **eine** Doktrin darf `active`/`escalated` sein; wird eine aktiv,
  `commitmentLeft=COMMITMENT`, andere sammeln Heat, werden aber erst nach Ablauf aktiv.
- `tickCommitment()` pro Puls −1; bei 0 Neubewertung erlaubt.
- `sabotage(id)` Heat −30, `commitmentLeft=0`, productionLevel −1. `provoke(id)` Heat +25.

- [ ] **T2.1 director (TDD).** Tests: starker Auto-Turret-Stil 3 Pulse → Störkrieg erreicht `active`;
  Commitment hält die aktive Doktrin trotz Stilwechsel ≥2 Pulse; `sabotage` senkt Heat+Stage;
  nie zwei Doktrinen gleichzeitig `active`.
- [ ] **T2.2** Die **4 Konfigs** in `doctrineConfig.ts` anlegen (Daten unten, Abschnitt „Doktrin-Daten").
- [ ] **T2.3** tsc + Test grün. **Commit:** `feat(doctrine): DoctrineConfig (4 Doktrinen) + Director (rein, TDD)`.

---

## Phase 3 — Verdrahtung in den Loop + Frontlage-Puls-Regler

**Files:** Modify `src/main.ts`, `src/ui/cameraPanel.ts`

- [ ] **T3.1** StyleTracker an die vorhandenen Stellen hängen: in `combat`-`onHit`/`onDeath`
  (`onDamageDealt` mit `fromAutoTurret` = team-Quelle Auto-Turret-Projektil; `onKill` mit Distanz),
  im Loop `onMove` (Spielertempo/-position), Booster-Zündung `onBoosterUsed`, Spieler-Treffer `onDamageTaken`.
- [ ] **T3.2** Frontlage-Puls: `let pulseCd = pulseLen; pulseCd -= simDt; if(<=0){ const p=tracker.snapshotAndReset(); director.evaluate(p, CONFIGS); director.tickCommitment(); refreshFrontlage(); pulseCd = pulseLen; }`. `pulseLen` live über Regler.
- [ ] **T3.3** Regler **„Frontlage-Puls (s)"** in `cameraPanel.ts` + `__tune.getPulse/setPulse` (Bereich 10–120 s, Default 40).
- [ ] **T3.4** tsc + Browser: über `__dbg` Stil simulieren → nach einem Puls steigt die passende Heat (Sonde `__dbg.doctrines()`). **Commit:** `feat(doctrine): Puls-Auswertung im Loop + Frontlage-Puls-Regler`.

---

## Phase 4 — Spawn-Modifikator (rein + Verdrahtung)

**Files:** Create `src/doctrine/spawnModifier.ts` (+ .test); Modify `src/enemy/spawner.ts`, `src/main.ts`

- [ ] **T4.1 (TDD)** `doctrineSpawnMix(stage, baseRoster)` → Anteil Doktrin-Einheiten je Stage
  (Spec §17: hint 5–10 %, preparing 10–20 %, active 20–30 % + 1 Quell-Objekt garantiert, escalated 30–40 % + Eskorte).
  **Keine** Komplett-Ersetzung — Basisgegner bleiben (§17.2). Liefert: welche `enemyTemplateIds` zusätzlich, ob Quell-Objekt fällig.
- [ ] **T4.2** Spawner um „Doktrin-Anforderung" erweitern: der Loop fragt pro Spawn den Modifier; Basis-Spawn bleibt.
- [ ] **T4.3** tsc + Test grün + Browser (active Störkrieg → Doktrin-Gegner mischen sich ein). **Commit:** `feat(doctrine): Spawn-Modifikator (Stage-abhaengige Mischung)`.

---

## Phase 5 — Doktrinen-Inhalt (je Doktrin eine Phase, gleiche Mechanik)

> Generische Bausteine zuerst, dann **4 gleichartige Daten-Phasen**. Jede Doktrin nutzt denselben
> Template-Faktory + Feldobjekt-Faktory + Effekt-Modul → garantiert konsistent.

- [ ] **T5.0a `enemyTemplates.ts`** — Faktory `spawnDoctrineEnemy(scene, templateId, level, pos)`:
  baut einen Gegner über die vorhandene `createEnemyEntity`-Pipeline mit Rolle (z. B. „flieht nach Störpuls",
  „stationär beim Aufbau", „markiert Spieler"). Rollen als kleine reine Verhaltens-Flags, ausgewertet im Loop.
- [ ] **T5.0b `fieldObjects.ts`** — Faktory `spawnFieldObject(scene, objectId, pos)`: Mesh + `effect`-Deskriptor
  + `onDestroyed`-Hook (Heat/Production runter, garantierter Marken-Drop).
- [ ] **T5.0c `effects.ts` (TDD)** — reine Effekt-Mathematik: `jamFactor(dist, radius)` (max 30–40 % Auto-Turret-Malus
  in Zone, §8.5), `artilleryWarn(dt)` (Warnzeit ≥1.5 s vor Einschlag, §23), `smokeBlocksLine(a,b,zones)`,
  `mineSlow(dist)` (kurz, vermeidbar). Tests gegen die Spec-Grenzwerte.

Dann je Doktrin (gleicher Task-Satz):

- [ ] **T5.1 Störkrieg** — Gegner: Jammer-Bike, Störpanzer (+ Relay-Truck/Schild-Eskorte eskaliert). Feldobjekt: **Signal-Relay** (Quelle). Effekt: Störzone senkt Auto-Turret-Treffsicherheit/Feuerrate in *sichtbarem* Radius (`effects.jamFactor`, nutzt vorhandene Auto-Turret-Accuracy). Ziel: „Zerstöre das Signal-Relay".
- [ ] **T5.2 Belagerungsdruck** — Gegner: Beobachterwagen, Belagerungspanzer (+ Brecher/Suchscheinwerfer). Feldobjekt: **Beobachtungsturm**. Effekt: Artillerie nur mit Beobachter + **sichtbarem Warnkreis** (`artilleryWarn`); Beobachter zerstört → Beschuss stoppt. Ziel: „Schalte den Beobachter aus".
- [ ] **T5.3 Nebel & Aufklärung** — Gegner: Rauchwerfer, Scout-Runner (+ Decoy/Deckungsfahrer). Feldobjekt: **Rauchgenerator**. Effekt: Rauchzonen brechen lange Sichtlinien (`smokeBlocksLine`), Nahkampf bleibt Antwort. Ziel: „Zerstöre den Rauchgenerator".
- [ ] **T5.4 Sperrkrieg** — Gegner: Minenleger, Blocker-Panzer (+ Kettenfänger/Köder). Feldobjekt: **Minenleger-Kommandowagen**. Effekt: sichtbare Minen/Bremszonen, **kurz & vermeidbar**, immer eine offene Route (`mineSlow`). Ziel: „Zerstöre den Minenleger".

Jede T5.x: tsc + Browser-Beweis (Doktrin aktiv → Gegner+Objekt erscheinen, Effekt sichtbar & lesbar, Quelle zerstörbar → Doktrin sinkt). **Commit je Doktrin.**

---

## Phase 6 — Doktrin-Loot (Marken) + Shop-Konter

**Files:** Create `src/doctrine/lootMarks.ts` (+ .test); Modify `src/shop/catalog.ts`, `src/shop/shop.ts`, `src/main.ts`

- [ ] **T6.1 (TDD)** `lootMarks`: Besitz-Set von Marken (z. B. `stoerspule`, `relaiskern`); `isUnlocked(itemId, marks)`
  prüft das Freischalt-Gate eines Konter-Items. Doktrin-Gegner/-Objekte droppen ihre Marke (über vorhandene `pickups`).
- [ ] **T6.2** Konter-Items je Doktrin in den Katalog (buyer `player`), `unlockCondition` = passende Marke besitzen.
  Beispiele: Turret-Abschirmung (Störkrieg), Zielwarn-Empfänger (Belagerung), Wärmebild-Optik (Nebel), Minenpflug (Sperrkrieg).
- [ ] **T6.3** Shop-UX: bei gesperrtem Item Quelle anzeigen („Benötigt: Störspule — Quelle: Störpanzer"). **Commit:** `feat(doctrine): Loot-Marken + Shop-Konter-Items`.

---

## Phase 7 — UI: Frontlage-HUD + Kampf-Banner/Marker

**Files:** Create `src/ui/frontlageHud.ts`, `src/ui/doctrineBanner.ts`; Modify `src/main.ts`

- [ ] **T7.1** `frontlageHud` (Taste **F**): aktive/vorbereitete Doktrin, Frontreaktion-Text, Stufe, Commitment, erwartete Gegner, möglicher Loot, verfügbare Gegenmaßnahmen. Daten aus Director/Config. Player-facing-Texte (§20).
- [ ] **T7.2** `doctrineBanner`: 3–5 s Aktivierungs-Banner + kleine Frontmeldungen + Zielmarker auf dem Quell-Objekt (Minimap-Punkt + Bildschirm-Zieltext) + Gefahrenzonen-Lesbarkeit (Störkreis/Artilleriekreis/Rauch/Mine).
- [ ] **T7.3** Stage-Wechsel → kurzer Frontlage-Update-Toast (ersetzt die Nach-Einsatz-Auswertung). **Commit:** `feat(doctrine): Frontlage-HUD (F) + Kampf-Banner/Zielmarker`.

---

## Phase 8 — Provokation

**Files:** Modify `src/ui/frontlageHud.ts`, `src/main.ts`

- [ ] **T8.1** Button „Feindliches Signal verstärken" im Frontlage-HUD, sichtbar ab `hint`. Kostet Credits/Intel,
  `director.provoke(id)` (+25 Heat), markiert nächsten Druck als „provoziert" (leicht höhere Belohnung).
  Nicht nutzbar, solange eine andere Doktrin committed aktiv ist (oder vormerken). **Commit:** `feat(doctrine): Provokation`.

---

## Phase 9 — Abnahme (Spec §26, adaptiert) + Politur

- [ ] **T9.1** Reaktion auf Auto-Turret-Stil → Störkrieg erreicht ≥ preparing, Jammer-Gegner + Signal-Relay, Auto-Turrets nur in sichtbarer Störzone geschwächt, Relay zerstörbar → Doktrin sinkt.
- [ ] **T9.2** Reaktion auf Einbunkern → Belagerung, Artillerie nur mit Warnkreis + Beobachter; Beobachter weg → Beschuss stoppt.
- [ ] **T9.3** Taktikwechsel erlaubt: aktive Doktrin bleibt durch Commitment kurz, wechselt nicht sofort; Doktrin-Einheiten farmbar.
- [ ] **T9.4** Provokation funktioniert (Heat steigt, mehr passende Gegner, gezieltes Farmen).
- [ ] **T9.5** Shop-Integration: Marke gelootet → Konter-Item sichtbar/kaufbar, Quelle erklärt.
- [ ] **T9.6** Kein Nemesis-Verhalten: kein NPC erinnert/spricht den Spieler an; nur die *Front* erinnert (System).
- [ ] **T9.7** Politur + TECH-DEBT-Eintrag offener Querverstärker (clean-vs-brutal, Save/Load — bewusst später). **Commit:** `feat(doctrine): Abnahme + Politur`.

---

## Doktrin-Daten (die 4 Konfigs — Quelle der Wahrheit)

| Doktrin | Trigger (Stil-Feld: mid/strong) | Gegner | Quell-Objekt | Effekt | Marke → Shop-Konter |
|---|---|---|---|---|---|
| **Störkrieg** | autoTurretDamageRatio 0.35/0.55; stationaryRatio verstärkt | Jammer-Bike, Störpanzer (+Relay-Truck, Schild-Eskorte) | Signal-Relay | Auto-Turret −30–40 % in sichtbarer Störzone | Störspule → Turret-Abschirmung |
| **Belagerungsdruck** | stationaryRatio 0.40/0.60; timeInSameArea 20/40 s | Beobachterwagen, Belagerungspanzer (+Brecher, Suchscheinwerfer) | Beobachtungsturm | Artillerie mit Warnkreis, braucht Beobachter | Optikmodul → Zielwarn-Empfänger |
| **Nebel & Aufklärung** | longRangeKillRatio 0.40/0.65 | Rauchwerfer, Scout-Runner (+Decoy, Deckungsfahrer) | Rauchgenerator | Rauch bricht lange Sichtlinien | Scout-Optik → Wärmebild-Optik |
| **Sperrkrieg** | closeRangeKillRatio 0.40/0.60; avgSpeed hoch; boosterUsage verstärkt | Minenleger, Blocker-Panzer (+Kettenfänger, Köder) | Minenleger-Kommandowagen | Minen/Bremszonen, kurz & vermeidbar | Minenkit → Minenpflug |

Player-facing-Gründe (§8.2/9.2/10.2/11.2) je Doktrin in der Konfig hinterlegt.

---

## Selbst-Review

- **Spec-Abdeckung:** Engine §5–7/§23 → P1/P2; Stil §6.1 → P1 (adaptiert); 4 Doktrinen §8–11 → P5; Spawn §17 → P4; Loot §14 → P6 (Marken statt Crafting); Shop §15 → P6; UI §16 → P7; Provokation §15.4 → P8; Abnahme §26 → P9; Verbote §3.4 → P0 (Löschung). Gestrichen: Save/Load §22, clean-vs-brutal §14.2, turretsPlaced.
- **Konsistenz:** Ein daten-getriebenes System (`DoctrineConfig`) für alle 4 Doktrinen — keine bespoke Vierfach-Implementierung.
- **Löschdisziplin:** Phase 0 löscht ersatzlos (kein Deaktivieren/Fallback); Git als Sicherheitsnetz.
- **Reihenfolge:** Treibstoff/Engine zuerst (P1–P4), dann Inhalt (P5) je Doktrin als feste Phase, dann Loot/Shop/UI/Provokation.
