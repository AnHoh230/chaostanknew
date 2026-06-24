# Plan: Spieler-Level-Up-Boni (Roguelike-Stat-Choices)

**Stand:** Projekt bei Commit ~`cd99294`. Befehl-Build komplett (B/BB/BBB + Aufbau + 3 Ults + Skillbaum). Gegner-HP eskaliert steil (`HP_PRO_LEVEL`), Schaden fast flach (kein One-Shot). Dieses Feature ist die **Spieler-Antwort** auf die Gegner-HP: eine zweite Wachstums-Achse neben dem Build-Aufbau.

## Ziel
Bei **jedem Level-Up** pausiert die Welt und zeigt **3 zufällige Karten**; der Spieler wählt eine, der Bonus akkumuliert dauerhaft. Pool:
| Karte | Effekt (pro Wahl) |
|---|---|
| ❤ Panzerung | +20 Max-HP |
| 💨 Antrieb | +8 % Tempo |
| 🎯 Zieloptik | +5 % Crit-Chance |
| 💥 Sprengkraft | +25 % Crit-Schaden |
| 🌀 Ausweichen | +4 % Dodge |
(Werte = Startwerte, tunebar. Crit-Chance startet 0, Crit-Schaden Basis ×1.5.)

## Was schon da ist (nicht neu bauen)
- **Level/XP**: `progression` (`src/progression/progression.ts`). `progression.addXp(n)` → `LevelUpInfo { gained, newMkUnlocks }`. Aufruf in `main.ts:565` (bei Kill). `progression.level`, `xpToNext()`, `unlockedMk()`.
- **Level-Up-Event**: `main.ts:565-570` — `const up = progression.addXp(...); if (up.gained > 0) showToast(...)`. **Hier die Auswahl auslösen** (statt nur Toast).
- **dodge/armor**: `playerCombatant.dodge`/`armor` verdrahtet (`main.ts:1571-1572`), Basis 0 aus `playerStats()`. Dodge wird im Treffer schon ausgewertet (Buffs).
- **Skill-Panel als UI-Vorlage**: `renderSkillPanel` / `skillPanel` / `openSkill`/`closeSkill` (`main.ts` ~1232-1305) — Auswahl-UI analog bauen (Welt pausieren via `clock.simSpeed = 0`).
- **playerStats()**: `main.ts:358` — `() => ({ damage: cls.damage, maxHp: cls.maxHp, speed: cls.speed, armor: 0, dodge: 0 })`. **Zentrale Stelle**, um Boni einzurechnen.

## Was fehlt (zu bauen)
1. **Boni-State + Pool** (neue Datei, rein/TDD).
2. **Crit** (Chance + Schaden) — gibt es noch nicht.
3. **Stat-Anwendung** in `playerStats()` + `playerCombatant`.
4. **Level-Up-Auswahl-UI** (3 random Karten).

## Dateien anzufassen

### NEU: `src/build/playerBoni.ts` (+ `playerBoni.test.ts`)
- `PlayerBoniState = { maxHp, speed, critChance, critDmg, dodge: number }` (akkumulierte Stufen/Werte).
- `createPlayerBoni()`.
- `BONI_POOL`: Defs `{ id, name, icon, text, apply(state) }` (5 Karten).
- `BONI_*_PRO_WAHL`-Konstanten (Werte oben).
- `waehleBoni(state, id)` — wendet eine Karte an.
- `randomBoniAuswahl(n=3)` — n zufällige Pool-IDs (Math.random ist in main/Modulen ok, NICHT in Workflow-Skripten).
- `critFaktor(state)` / Helper für die Crit-Berechnung (oder in main).

### `src/main.ts`
- **Import** playerBoni.
- **State**: `const playerBoni = createPlayerBoni();` + UI-State (`levelUpOpen`, Pending-Auswahl-Queue, da mehrere Level-Ups gleichzeitig fallen können).
- **playerStats()** (358): `maxHp: cls.maxHp + playerBoni.maxHp`, `speed: cls.speed * (1 + playerBoni.speed)`, `dodge: playerBoni.dodge`. (armor lassen oder optional.)
- **playerCombatant.maxHp/speed**: werden aus `pst` gesetzt (~1571) — automatisch mit, sobald playerStats() die Boni hat. **Achtung**: maxHp-Erhöhung — aktuelle hp ggf. mit anheben (sonst nur maxHp hoch, hp bleibt).
- **Crit** an den 6 Spieler-Schaden-Stellen: `main.ts:647, 776, 792, 805, 844, 911`. Eine `mitCrit(dmg): number` (würfelt critChance → ×(1+critDmg)); jede `playerStats().damage * ...`-Schadenszeile durch `mitCrit(...)` wickeln. Optional Crit-Floating-Number (gelb→orange/größer).
- **Level-Up → Auswahl**: bei `up.gained > 0` (565) statt nur Toast → Auswahl-Panel öffnen (pro gewonnenem Level eine Auswahl; Queue, falls mehrere). Welt pausieren.
- **Auswahl-UI**: `renderLevelUpPanel()` (3 random Karten als klickbare Reihen, analog `renderSkillPanel`) + Click-Handler → `waehleBoni` → nächste Queue-Auswahl oder schließen. Eigenes `levelUpPanel`-DOM (oder skillPanel wiederverwenden).
- **HUD** (optional): Crit-Chance / Boni-Übersicht irgendwo zeigen.

## Reihenfolge (wie beim Skillbaum: erst Logik, dann UI)
1. `playerBoni.ts` + Tests (State, Pool, waehleBoni, random, Crit-Helper).
2. `main.ts`: playerStats() + Boni; Crit an den 6 Schaden-Stellen (`mitCrit`); maxHp-hp-Anhebung.
3. `main.ts`: Level-Up → Auswahl-Panel (Queue, pausieren) + UI + Click.
4. tsc + vitest + commit. Nutzer testet (keine Browser-Selbstverifikation).

## Offene Design-Punkte (vor/während Bau klären)
- **Mehrere Level-Ups gleichzeitig** (ein dicker Kill): Auswahl-Queue nacheinander abarbeiten.
- **Crit auch auf Gift-DoT/AoE?** Vorschlag: erstmal nur auf Direktschüsse (die 6 Stellen), nicht auf DoT-Ticks.
- **Pool-Größe/Dubletten**: 3 aus 5 ohne Doppelte; später mehr Karten möglich.
- **Werte-Balance**: Startwerte oben, nach Test justieren (analog `BEFEHL_DMG_PRO_STUFE`-Vorgehen).
