# Transparenz & Shop-Overhaul — Implementierungsplan

> **Für agentische Worker:** ERFORDERLICHE SUB-SKILL: `superpowers:executing-plans` (oder `subagent-driven-development`) für die Task-für-Task-Umsetzung. Schritte nutzen Checkbox-Syntax (`- [ ]`). Jede Phase endet **spielbar, getestet (Vitest grün + `tsc` clean), im Browser belegt, committet** — wie die Slices S1–S4.

**Goal:** Den Gegner-Build transparent machen (Inspizieren) und den Shop zu einer echten Credit-Senke ausbauen — für Spieler **und** Gegner, inkl. Verbrauchs-Items, neuer Slots, Auto-Turrets, Nemesis-Diensten und autonomer Gegner-Kauf-/Auslöse-KI.

**Architecture:** Ein Item-Modell mit `kind` + `buyer`-Tag; ein gemeinsames Loadout (9 Equip-Slots + 3 Usable-Gürtel-Slots); ein Aktiv-Buff-Stack, den Spieler und Gegner teilen; eine Gegner-Kauf-KI (was kaufen) und Auslöse-KI (wann zünden), die auf denselben Daten laufen wie die Spieler-Seite. Inspizier-System liest reine Snapshots.

**Tech Stack:** Babylon.js v8, TypeScript strict ESM, Vite (Port 5174), Vitest. Bestehende Muster: pure Logik-Module + Tests, DOM-Overlays via `Vector3.Project`, `clock.simSpeed` für Pause/Slowmo, `__dbg`/`__live` für Browser-Verifikation.

**Specs:** `docs/superpowers/specs/2026-06-20-inspizier-transparenz-system-design.md` (Phase P0). Shop-Overhaul-Design ist hier im Plan dokumentiert (Abschnitt „Gemeinsames Datenmodell").

---

## Reihenfolge & Begründung (nach Abhängigkeiten)

1. **P0 — Inspizier-System** (M-Karte + I-Inspizieren). Unabhängig, liefert das Tell, das den Rest lesbar macht.
2. **SH1 — Shop-Gerüst:** Item-Modell (`kind`/`buyer`), Kategorie-Registry, GUI-Reiter. Fundament für alles Weitere.
3. **SH2 — Aktiv-Buff-Framework + Sofort-Booster + Gürtel/Hotkeys + Turm-Slew.** Kern-Infra (Buffs), die SH5 für Gegner wiederverwendet.
4. **SH3 — Auto-Turrets + Treffsicherheit/Ausweichen.** Neue Stat-Achse; schaltet Debuff-Booster frei; erster Gegner-Sink jenseits Level.
5. **SH4 — Volles Loadout (alle Slots) + System-Module + Einsatz-Items + Trefferrichtung.** „Slot-Tiefe komplett."
6. **SH5 — Verhaltens-Kerne (Gegner) + Gegner-Kauf-KI + Gegner-Auslöse-KI.** Schließt die Gegner-Ökonomie.
7. **SH6 — Drama-Sinks:** Nemesis-Dienste · Verträge · Garage · Trophäenwand · Unique-Items.

---

## Gemeinsames Datenmodell (gilt für ALLE Phasen — hier festgezurrt)

### Slots (gemeinsames Loadout)
Equip-Slots (9): `waffe`, `sekundaer`, `ruestung`, `zusatzpanzerung`, `wanne`, `turm`, `raeder`, `systemmodul`, `kern`.
Usable-Gürtel: `usable1`, `usable2`, `usable3` (halten Verbrauchs-Ladungen, kein Equip).

- `kern` ist im Modell vorhanden, aber **Verhaltens-Kern-Items sind `buyer:'enemy'`** → der Spieler-Shop zeigt sie nie, der Spieler-`kern` bleibt leer. (Spieler-Doktrinen ggf. später.)
- Bestehende 5 Slots (`waffe/wanne/turm/raeder/ruestung`) bleiben unverändert kompatibel; neue Slots kommen additiv.

### Item-Taxonomie
```ts
export type Buyer = 'player' | 'enemy' | 'both';
export type ItemKind = 'equip' | 'consumable' | 'service' | 'contract' | 'garage';
export type Category =
  | 'equipment' | 'instant' | 'usables' | 'garage' | 'nemesis' | 'contracts';
```
- `equip` — geht in einen Equip-Slot. Umfasst Waffen, Panzerung, Auto-Turrets (`sekundaer`), System-Module (`systemmodul`), Verhaltens-Kerne (`kern`). Bestehende `ShopItem` werden `kind:'equip'`, `buyer:'both'`.
- `consumable` — Gürtel-Ladung, im Kampf per Hotkey gezündet. Zwei GUI-Kategorien teilen denselben Mechanismus: `consumableType: 'booster' | 'usable'`.
- `service` — einmaliger Nemesis-Effekt (kein Halten).
- `contract` — umschaltbarer Wirtschafts-Modifikator.
- `garage` — dauerhafter Meta-Ausbau.

### Stat-Achsen (additiv zum bestehenden Stat-Modell)
Bestehend: `damage`, `maxHp`, `speed`, `armor`. **Neu:** `accuracy` (0..1, nur Auto-Feuer), `dodge` (0..1, Chance Treffer ganz zu negieren), `fireRate` (Multiplikator), `turnRate`/`turretSlew` (für Booster). Defaults: accuracy 1 (für manuelles Spielerfeuer irrelevant), dodge 0, fireRate 1.

### Käufer-Filter
- Spieler-GUI zeigt Items mit `buyer ∈ {player, both}`.
- Gegner-Kauf-KI (`runEnemyShopVisit`) zieht aus `buyer ∈ {enemy, both}`.

### Datei-Landkarte (neu/geändert)
```
src/inspect/enemyInfo.ts·.test       P0  reiner Gegner-Snapshot
src/inspect/enemyPick.ts·.test       P0  Cursor→Gegner-Pick
src/ui/overviewMap.ts                P0  große Live-Karte
src/ui/inspectCard.ts                P0  modale Info-Karte
src/shop/itemTypes.ts·.test          SH1 Buyer/ItemKind/Category + Guards
src/shop/categories.ts               SH1 Kategorie-Registry (Reiter)
src/shop/catalog.ts (erweitern)      SH1+ kind/buyer an Equip; neue Kataloge je Phase
src/combat/buffs.ts·.test            SH2 Aktiv-Buff-Stack (Spieler+Gegner)
src/shop/boosters.ts·.test           SH2 Booster-Definitionen (consumable)
src/player/belt.ts·.test             SH2 Usable-Gürtel (3 Ladungs-Slots)
src/ui/buffHud.ts                    SH2 aktive Buffs + Timer
src/combat/turret.ts·.test           SH2 Turm-Slew (Dreh-Tempo)
src/combat/accuracy.ts·.test         SH3 Jitter + Dodge-Wurf
src/combat/autoTurret.ts·.test       SH3 Auto-Turret-Verhalten
src/combat/hitDirection.ts·.test     SH4 Trefferwinkel (Zusatzpanzerung)
src/enemy/behaviorCore.ts·.test      SH5 Verhaltens-Kerne
src/enemy/enemyBuyAI.ts·.test        SH5 Kauf-Priorität + Budget
src/enemy/enemyTriggerAI.ts·.test    SH5 Auslöse-Politik
src/shop/services.ts·.test           SH6 Nemesis-Dienste
src/shop/contracts.ts·.test          SH6 Verträge
src/shop/garage.ts·.test             SH6 Garage-Ausbau
src/meta/trophyWall.ts·.test         SH6 Trophäenwand
src/player/loadout.ts (erweitern)    SH3/SH4 neue Slots + Stat-Achsen
src/shop/shop.ts (erweitern)         SH1/SH4/SH6 Reiter + neue Kategorien
src/combat/combat.ts (erweitern)     SH3 Dodge + Auto-Feuer-Jitter
src/main.ts (verdrahten)             alle Phasen
```

---

# Phase P0 — Inspizier-System (M-Karte + I-Inspizieren)

Spec: `2026-06-20-inspizier-transparenz-system-design.md`. Liefert Übersichtskarte (M, Echtzeit) + modalen Tiefblick (I, Pause).

### Task P0.1: enemyPick (reiner Cursor→Gegner-Picker)
**Files:** Create `src/inspect/enemyPick.ts`, `src/inspect/enemyPick.test.ts`.
- [ ] **Test zuerst** (`enemyPick.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { nearestToPointer } from './enemyPick';
const blips = [{ id: 'a', sx: 100, sy: 100 }, { id: 'b', sx: 300, sy: 300 }];
describe('nearestToPointer', () => {
  it('nimmt den nächsten innerhalb maxPx', () => {
    expect(nearestToPointer(110, 105, blips, 70)).toBe('a');
  });
  it('nichts in Reichweite → null', () => {
    expect(nearestToPointer(500, 500, blips, 70)).toBeNull();
  });
  it('leere Liste → null', () => {
    expect(nearestToPointer(0, 0, [], 70)).toBeNull();
  });
  it('Gleichstand → erster', () => {
    expect(nearestToPointer(200, 200, [{id:'a',sx:150,sy:200},{id:'b',sx:250,sy:200}], 70)).toBe('a');
  });
});
```
- [ ] **Implementieren:** `nearestToPointer(px,py,blips,maxPx)` → euklidisch nächster `id` mit `dist ≤ maxPx`, sonst `null`; bei Gleichstand erster (strikt `<`).
- [ ] **Test grün**, `tsc` clean, **commit**: `P0.1: enemyPick`.

### Task P0.2: enemyInfo (reiner Snapshot)
**Files:** Create `src/inspect/enemyInfo.ts`, `.test.ts`. Liest `enemyMk` (equipment.ts), `sellValue`/Item-Felder.
- [ ] **Test:** benannter Gegner → `isNamed`, `archetyp`, `history.hasHistory=true` mit Akte-Werten; „Panzer N" → `archetyp=null`, `history.hasHistory=false`; `equipment` → `{slot,name,stat}`; `mk=enemyMk(level)`; `boosters=[]`.
- [ ] **Implementieren:** `buildEnemyInfo(e: EnemyLike, akte: AkteLike|null): EnemyInfo` exakt nach Spec §5/§7. `EnemyLike` = schmaler struktureller Typ (`{id,displayName,named,motiveId,level,combatant:{hp,maxHp,armor,lootValue},equipment,bag}`). Stat-Text wie im Shop (`statText`).
- [ ] **Test grün**, `tsc` clean, **commit**: `P0.2: enemyInfo`.

### Task P0.3: inspectCard (modales Overlay)
**Files:** Create `src/ui/inspectCard.ts`.
- [ ] **Implementieren:** `createInspectCard(): InspectCard` mit `open(info)/close()/isOpen()`. Dunkles Vollbild-Overlay (`position:fixed;inset:0;background:rgba(4,6,8,0.78);z-index:40`) + hervorgehobene Karte (Rahmen, Schatten) mit den Abschnitten aus Spec §4 (Kopf, Stats, Ausrüstung, Inventar, „Aktive Booster — (leer)", Historie). Klick auf Overlay schließt. Kein eigener Tasten-Listener (Tasten kommen aus main.ts).
- [ ] **Browser-Smoke** (in P0.5): Karte rendert mit Beispiel-Snapshot.
- [ ] `tsc` clean, **commit**: `P0.3: inspectCard`.

### Task P0.4: overviewMap (große Live-Karte)
**Files:** Create `src/ui/overviewMap.ts`. Nutzt `minimapMath.projectBlip`, `enemyPick.nearestToPointer`.
- [ ] **Implementieren:** `createOverviewMap(): OverviewMap` mit `toggle()/isOpen()/update(px,pz,blips,pointerX,pointerY)`. Canvas-Overlay mittig, ~60 % der kürzeren Kante, Range 150, spielerzentriert. Zeichnet Spieler/Gegner/Shop-Felder (benannte rot+größer). Hover: Blips auch in Pixel projizieren, `nearestToPointer` → Tooltip-DIV am Cursor mit kondensiertem Inhalt (Name/Lvl·MK/HP-Balken/Motiv). Keine Pause.
- [ ] `tsc` clean, **commit**: `P0.4: overviewMap`.

### Task P0.5: Verdrahtung M/I in main.ts
**Files:** Modify `src/main.ts`.
- [ ] **Implementieren:**
  - Instanzen `overviewMap`, `inspectCard` erzeugen; `let prevSimSpeed=1; let inspecting=false`.
  - Pro Frame: lebende Gegner via `Vector3.Project` → `ScreenBlip[]`; `hoveredId = nearestToPointer(scene.pointerX, scene.pointerY, blips, 70)`; DOM-Hinweis „[I] Inspizieren" an der projizierten Position des gehoverten Gegners (DOM-Pool, nur wenn `!inspecting && !overviewMap.isOpen()` … Hinweis auch bei offener Karte ok).
  - Bei offener M-Karte: `overviewMap.update(px,pz, blips(world), scene.pointerX, scene.pointerY)`.
  - Keydown **m**: `overviewMap.toggle()`.
  - Keydown **i**: wenn `inspecting` → schließen (`inspectCard.close(); clock.simSpeed=prevSimSpeed; inspecting=false`); sonst wenn `hoveredId` → `info=buildEnemyInfo(e, akteBuch.get(id)); prevSimSpeed=clock.simSpeed; clock.simSpeed=0; inspectCard.open(info); inspecting=true`.
  - Keydown **Escape**: schließt Inspect (gleicher Pfad).
  - Klick aufs Overlay schließt ebenfalls (inspectCard ruft Callback → gleicher Schließ-Pfad). `inspectCard.open` einen `onClose`-Callback mitgeben, der `clock.simSpeed=prevSimSpeed; inspecting=false` setzt.
  - `__dbg`: `inspect:()=>({open:inspecting, simSpeed:clock.simSpeed}), openInspect:(id)=>…, mapOpen:()=>overviewMap.isOpen()`.
- [ ] **Browser-Verifikation:** M öffnet/schließt, Punkte bewegen sich live; Hover→Tooltip korrekt; „[I] Inspizieren" erscheint am Gegner; I → `__dbg.inspect().simSpeed===0`, Karteninhalt == `__dbg.enemyState(id)`; Schließen → simSpeed zurück. Screenshot beider Ansichten. Keine Konsolenfehler.
- [ ] **commit**: `P0.5: M-Karte + I-Inspizieren verdrahtet`.

---

# Phase SH1 — Shop-Gerüst (Item-Modell + Kategorie-Reiter)

### Task SH1.1: itemTypes (Buyer/ItemKind/Category + Guards)
**Files:** Create `src/shop/itemTypes.ts`, `.test.ts`.
- [ ] **Test:** Type-Guards `canBuy(item, who)` (`who:'player'|'enemy'` → true wenn `buyer===who || buyer==='both'`); `itemsForCategory(items, cat)` filtert korrekt.
- [ ] **Implementieren:** Typen `Buyer/ItemKind/Category` (wie oben), Interface-Basis `BaseItem { id; name; kind; buyer; category; cost }`, `canBuy`, `itemsForCategory`.
- [ ] Test grün, `tsc` clean, **commit**: `SH1.1: Item-Taxonomie + Guards`.

### Task SH1.2: Equip-Items taggen
**Files:** Modify `src/shop/catalog.ts`.
- [ ] **Implementieren:** Jedes generierte `ShopItem` bekommt `kind:'equip'`, `buyer:'both'`, `category:'equipment'`. `ShopItem` erbt/erweitert `BaseItem`. Bestehende Felder unverändert. Bestehende Tests/`tsc` müssen grün bleiben (ggf. Typ-Erweiterung anpassen).
- [ ] Volltest-Suite grün, `tsc` clean, **commit**: `SH1.2: Equip-Items mit kind/buyer/category`.

### Task SH1.3: Kategorie-Registry
**Files:** Create `src/shop/categories.ts`.
- [ ] **Implementieren:** `export const CATEGORIES: {id:Category; name:string; desc:string}[]` mit den 6 Reitern (equipment „Ausrüstung", instant „Sofort-Booster", usables „Einsatz-Items", garage „Garage", nemesis „Feindakten", contracts „Verträge"). Reiner Daten-Export.
- [ ] `tsc` clean, **commit**: `SH1.3: Kategorie-Registry`.

### Task SH1.4: Shop-GUI auf Reiter umbauen
**Files:** Modify `src/shop/shop.ts`.
- [ ] **Implementieren:** Über der „Kaufen"-Spalte eine **Reiter-Leiste** (`CATEGORIES`, aktiver Reiter hervorgehoben). Aktiver Reiter steuert, welche Items die Kaufen-Spalte zeigt; Filter `itemsForCategory(items, activeCat)` + bestehender Slot-Filter nur in `equipment`. Für noch leere Kategorien (instant/usables/garage/nemesis/contracts) Platzhalter-Text „Kommt in dieser Werkstatt-Stufe". Ausrüstung/Inventar-Spalten unverändert. **Klick-Sicherheit beibehalten** (kein `refresh()` pro Frame; `updateMoney` bleibt per-Frame).
- [ ] **Browser-Verifikation:** Reiter klickbar, wechselt Inhalt; Equipment-Kauf funktioniert weiter (kaufen/verkaufen/anlegen). Keine Konsolenfehler, Screenshot.
- [ ] **commit**: `SH1.4: Shop-Reiter-GUI`.

---

# Phase SH2 — Aktiv-Buffs + Sofort-Booster + Gürtel + Turm-Slew

### Task SH2.1: Buff-Stack (gemeinsam Spieler/Gegner)
**Files:** Create `src/combat/buffs.ts`, `.test.ts`.
- [ ] **Test:** `add(buff)` mit `{id,duration,mods}` (mods = additive/multiplikative Deltas auf damage/speed/maxHp/armor/fireRate/turretSlew/accuracy/dodge); `tick(dt)` läuft Dauer runter, entfernt abgelaufene; `aggregate()` summiert additive + multipliziert multiplikative; gestapelte gleiche `id` refreshen Dauer (kein Doppelstapel). Beispiel: Booster +50% speed 8s → nach 8.1s weg.
- [ ] **Implementieren:** `createBuffStack(): BuffStack { add, tick(dt), aggregate(): BuffMods, active(): ActiveBuff[] }`. Rein, kein DOM.
- [ ] Test grün, `tsc` clean, **commit**: `SH2.1: Aktiv-Buff-Stack`.

### Task SH2.2: Turm-Slew (Dreh-Tempo)
**Files:** Create `src/combat/turret.ts`, `.test.ts`; Modify `src/input/input.ts`.
- [ ] **Test (`turret.ts`):** `stepTurret(current, target, slewRate, dt)` dreht `current` Richtung `target` höchstens `slewRate*dt` (kürzester Winkel, wrap an ±π). `slewRate=Infinity` → sofort `target`.
- [ ] **Implementieren:** Pure `stepTurret`. In `input.ts` Turm nicht mehr instant setzen, sondern via `stepTurret` mit `slewRate` (Default hoch, z. B. 8 rad/s; aus Buff/Modul modifizierbar). Spieler-Default so hoch, dass es sich weiter direkt anfühlt; Turmservo-Booster erhöht ihn.
- [ ] **Browser:** Turm folgt Maus flüssig; mit künstlich gesenkter Slew sichtbar träger (Debug-Hook). `tsc` clean, Tests grün, **commit**: `SH2.2: Turm-Slew`.

### Task SH2.3: Booster-Katalog (consumable)
**Files:** Create `src/shop/boosters.ts`, `.test.ts`.
- [ ] **Test:** Katalog-Integrität — jede ID eindeutig; jede hat `kind:'consumable'`, `consumableType:'booster'`, `category:'instant'`, `cost>0`, `buyer` gesetzt, ein `effect` (Buff-Mods + Dauer ODER Sofort-Effekt). Mind. diese: Notstrom-Zünder (speed×1.5/8s), Panzerhaut-Schaum (+temp HP sofort), Überdruck-Munition (nächste 3 Schüsse +Schaden), Kühlmittel (fireRate×1.5/6s), Turmservo-Boost (turretSlew×2/12s), Letzte-Schicht (armor-Buff nur <20% HP/8s). `buyer:'both'` (Gegner nutzen sie in SH5).
- [ ] **Implementieren:** `BOOSTERS: BoosterDef[]` + `boosterDef(id)`.
- [ ] Test grün, `tsc` clean, **commit**: `SH2.3: Booster-Katalog`.

### Task SH2.4: Usable-Gürtel
**Files:** Create `src/player/belt.ts`, `.test.ts`.
- [ ] **Test:** `createBelt(3)` — `add(charge)` füllt nächsten freien Slot (bis 3); `slots()`; `trigger(i)` gibt die Ladung zurück und leert den Slot (verbraucht) oder `null` wenn leer; Stapelung gleicher Ladung optional als Anzahl.
- [ ] **Implementieren:** `Belt { add(item):boolean; trigger(i):ConsumableDef|null; slots():(ConsumableDef|null)[]; }`.
- [ ] Test grün, `tsc` clean, **commit**: `SH2.4: Usable-Gürtel`.

### Task SH2.5: Buff-HUD
**Files:** Create `src/ui/buffHud.ts`.
- [ ] **Implementieren:** `createBuffHud()` mit `update(active: ActiveBuff[])` — Icon-Reihe mit ablaufendem Timer-Ring/Balken je aktivem Buff (DOM-Pool). Position oben links unter dem Geld.
- [ ] `tsc` clean, **commit**: `SH2.5: Buff-HUD`.

### Task SH2.6: Verdrahtung Booster (Spieler)
**Files:** Modify `src/main.ts`, `src/shop/shop.ts`, `src/player/loadout.ts`.
- [ ] **Implementieren:**
  - `loadout.stats()` liest zusätzlich `buffStack.aggregate()` (Spieler-Buffs) → effektive damage/speed/fireRate/armor/turretSlew. `playerSpeed`, `fire`-Cooldown, Turm-Slew lesen die gebufften Werte.
  - Shop-Reiter „instant": Booster kaufen → landen als Ladung im **Gürtel** (`belt.add`), nicht sofort aktiv.
  - Hotkeys **1/2/3**: `belt.trigger(i)` → Booster-Effekt auf `buffStack` (oder Sofort-Effekt wie Panzerhaut-Schaum: temp HP). Nur außerhalb Shop/Inspect.
  - Loop: `buffStack.tick(simDt)`, `buffHud.update(buffStack.active())`.
  - „Überdruck-Munition" (nächste 3 Schüsse): Zähler im Feuer-Pfad.
  - `__dbg`: `buffs:()=>buffStack.active(), belt:()=>belt.slots().map(...)`.
- [ ] **Browser-Verifikation:** Booster im Shop kaufen → erscheint im Gürtel/HUD-Slot; Hotkey zündet → Buff im HUD mit Timer, Effekt messbar (`__live` Tempo/fireCd vorher/nachher), läuft ab. Geld sinkt. Screenshot. Keine Konsolenfehler.
- [ ] **commit**: `SH2.6: Sofort-Booster spielbar`.

---

# Phase SH3 — Auto-Turrets + Treffsicherheit/Ausweichen

### Task SH3.1: Accuracy/Dodge-Mathematik
**Files:** Create `src/combat/accuracy.ts`, `.test.ts`.
- [ ] **Test:** `applyJitter(dirRad, accuracy, rng)` — bei `accuracy=1` keine Abweichung; bei `<1` Abweichung ≤ `maxJitter*(1-accuracy)` (deterministisch mit Fake-rng prüfen). `dodgeRoll(dodge, rng)` — `dodge=0`→immer false; `dodge=1`→immer true; `dodge=0.5, rng()=0.4`→true, `rng()=0.6`→false.
- [ ] **Implementieren:** `applyJitter`, `dodgeRoll`. `maxJitter` Konstante (z. B. 0.25 rad).
- [ ] Test grün, `tsc` clean, **commit**: `SH3.1: Accuracy/Dodge-Math`.

### Task SH3.2: Dodge in combat.ts
**Files:** Modify `src/combat/combat.ts`, `src/combat/combat.test.ts`.
- [ ] **Test:** Combatant mit `dodge:1` nimmt keinen Schaden (Treffer „ausgewichen", Projektil verbraucht); `dodge:0` normal. rng injizierbar (CombatOptions bekommt optionales `rng`).
- [ ] **Implementieren:** Im Treffer-Pfad nach Team/Invuln-Check: `if (t.dodge && dodgeRoll(t.dodge, rng())) { pool.deactivate(p); onHit?(…ausgewichen, damage:0…); return; }`. `Combatant.dodge?:number`.
- [ ] Volltest grün, `tsc` clean, **commit**: `SH3.2: Ausweichen im Kampf`.

### Task SH3.3: Auto-Turret-Verhalten
**Files:** Create `src/combat/autoTurret.ts`, `.test.ts`.
- [ ] **Test:** `stepAutoTurret(state, candidates, dt)` — wählt nächstes feindliches Ziel in Reichweite; zählt `cooldown` runter; bei `cooldown≤0 && Ziel` → liefert `{fire:true, target, dirJitterApplied}` und setzt Cooldown; kein Ziel → `{fire:false}`. Rein (rng injiziert).
- [ ] **Implementieren:** Reine Logik (Zielwahl + Cooldown). Feuer-Richtung mit `applyJitter(…, accuracy)`.
- [ ] Test grün, `tsc` clean, **commit**: `SH3.3: Auto-Turret-Logik`.

### Task SH3.4: Loadout-Erweiterung (sekundaer + Stat-Achsen)
**Files:** Modify `src/player/loadout.ts`, `.test.ts`; `src/shop/catalog.ts`.
- [ ] **Test:** `stats()` enthält jetzt `accuracy/dodge/fireRate`; `sekundaer`-Slot equipbar; Auto-Turret-Item liefert `autoFire`-Daten + `accuracy`; Module liefern `dodge`/`accuracy`. Slot-Liste erweitert.
- [ ] **Implementieren:** Slot-Typ + `SLOTS`/`SLOT_SOCKET` um `sekundaer` ergänzen; `DerivedStats` um `accuracy/dodge/fireRate`. Katalog: Auto-Turret-Items (`slot:'sekundaer'`, `autoFire:{cooldown,damage}`, `accuracy`) + erste Treffsicherheits/Ausweich-Module (als `systemmodul` vorbereitet ODER eigene Stat-Items) — `buyer:'both'`.
- [ ] Test grün, `tsc` clean, **commit**: `SH3.4: sekundaer-Slot + Stat-Achsen`.

### Task SH3.5: Auto-Turret im Spiel (Spieler + Gegner)
**Files:** Modify `src/main.ts`, `src/enemy/enemy.ts`.
- [ ] **Implementieren:** Spieler mit `sekundaer`-Auto-Turret: pro Frame `stepAutoTurret` über lebende Gegner → bei `fire` ein Projektil (`team:'player'`, Schaden/Accuracy des Turrets). Gegner-Entität bekommt optionales `autoTurret`-State; trägt ein Gegner ein Auto-Turret (gesetzt durch Kauf-KI SH5, hier vorbereitet + manuell per `__dbg` testbar), feuert es analog (`team:e.id`). `enemyInfo`/`inspectCard` zeigen accuracy/dodge/Auto-Turret automatisch (liest neue Felder).
- [ ] **Browser-Verifikation:** Spieler-Auto-Turret feuert autonom auf nächsten Gegner (sichtbare Projektile ohne Spieler-Klick); Treffer streuen bei niedriger accuracy; Gegner mit `__dbg`-gesetztem Auto-Turret + dodge: Salve weicht teils aus (Trefferquote messbar < ohne dodge). Screenshot. Keine Konsolenfehler.
- [ ] **commit**: `SH3.5: Auto-Turrets aktiv (beide Seiten)`.

### Task SH3.6: Debuff-Booster reaktivieren
**Files:** Modify `src/shop/boosters.ts`, `src/main.ts`.
- [ ] **Implementieren:** Booster, die jetzt Sinn ergeben: Rauchstoß-Kapsel/Motorbrüllen/Zielmarkierungs-Laser → senken `accuracy` naher Gegner bzw. erhöhen eingehenden Schaden eines Ziels für kurze Zeit (über `buffStack` auf den/die Gegner-Combatant(s), negative mods). `buyer:'player'` (Spieler-Werkzeug). Verdrahtung wie SH2.6.
- [ ] **Browser:** Zielmarkierungs-Laser auf einen Gegner → dessen eingehender Schaden kurz höher (messbar); Rauchstoß → Auto-Turret-Trefferquote naher Gegner sinkt. Screenshot. **commit**: `SH3.6: Debuff-Booster`.

---

# Phase SH4 — Volles Loadout + System-Module + Einsatz-Items + Trefferrichtung

### Task SH4.1: Trefferrichtung
**Files:** Create `src/combat/hitDirection.ts`, `.test.ts`.
- [ ] **Test:** `hitSector(targetHeading, projectileDir)` → `'front'|'seite'|'heck'` nach Winkel (front ±45°, heck ±45° hinten, sonst seite).
- [ ] **Implementieren:** reine Winkel-Klassifikation.
- [ ] Test grün, `tsc` clean, **commit**: `SH4.1: Trefferrichtung`.

### Task SH4.2: Zusatzpanzerung (gerichtete Reduktion) in combat
**Files:** Modify `src/combat/combat.ts`, `.test.ts`.
- [ ] **Test:** Combatant mit `directionalArmor:{front:0.5}` + Treffer von vorne → halber Schaden; von der Seite → unverändert. Braucht `heading` + Projektil-Richtung am Combatant/Projektil (Projektil hat `dx,dz`; Combatant `heading?`).
- [ ] **Implementieren:** Nach Basisschaden `hitSector` bestimmen, gerichtete Reduktion anwenden. Felder optional (Defaults neutral).
- [ ] Volltest grün, `tsc` clean, **commit**: `SH4.2: Zusatzpanzerung-Wirkung`.

### Task SH4.3: Loadout — restliche Slots
**Files:** Modify `src/player/loadout.ts`, `.test.ts`; `src/shop/catalog.ts`; `src/tank/sockets.ts` (falls Sichtbarkeit nötig — sonst nur Logik).
- [ ] **Test:** alle 9 Equip-Slots equipbar; `stats()` aggregiert `zusatzpanzerung`(directional)/`systemmodul`(passiv: accuracy/dodge/fireRate/sicht)/`kern`(nur Gegner relevant, Spieler leer). Katalog liefert Items je neuem Slot mit `buyer`-Tag (`kern`→`enemy`).
- [ ] **Implementieren:** Slots vervollständigen; `stats()` erweitern; Katalog-Generatoren für zusatzpanzerung + systemmodul (`buyer:'both'`), Platzhalter-Generator für kern-Items kommt in SH5.
- [ ] Test grün, `tsc` clean, **commit**: `SH4.3: volles 9-Slot-Loadout`.

### Task SH4.4: Einsatz-Item-Katalog + Effekte
**Files:** Create `src/shop/usables.ts`, `.test.ts`; Modify `src/main.ts`.
- [ ] **Test:** Katalog-Integrität (`consumableType:'usable'`, `category:'usables'`, eindeutig, `cost`, `buyer`). Set: Reparaturdrohne (Heilung über Zeit, pausiert bei hartem Treffer), Schrottmagnet (zieht Loot/Credits nach Kampf), Minenstreifen (legt Minen beim Rückwärtsfahren), Hakenanker (Bremsen/Zug), Notfall-Rauchfass (Sichtradius runter, eigener auch), Rivalen-Sender (lockt benannten Rivalen). Effekt-Typen als diskrete Tags.
- [ ] **Implementieren:** `USABLES` + Effekt-Ausführung in main.ts beim Gürtel-Trigger (je Effekt-Tag ein Handler; Minen als kleine Pickup-/Schaden-Objekte, Drohne als Heilungs-Buff mit Unterbrechung, Schrottmagnet erhöht Pickup-Reichweite kurz, Rivalen-Sender ruft einen `respawnTimer`-Rivalen herbei).
- [ ] **Browser-Verifikation:** je ein Usable testen (Reparaturdrohne heilt sichtbar; Schrottmagnet zieht Loot; Minenstreifen legt Minen). Screenshot. **commit**: `SH4.4: Einsatz-Items`.

### Task SH4.5: GUI — alle Slots + Usables-Reiter
**Files:** Modify `src/shop/shop.ts`.
- [ ] **Implementieren:** Ausrüstungs-Spalte zeigt alle 9 Slots (Labels). Reiter „usables" listet Einsatz-Items (Kauf → Gürtel). „instant" + „usables" teilen den Gürtel; volle Gürtel-Anzeige. Vergleichspfeile auch für neue Equip-Slots.
- [ ] **Browser:** alle Slots sicht-/befüllbar; Usables kaufbar→Gürtel; Klicks heil. Screenshot. **commit**: `SH4.5: Loadout-GUI komplett`.

---

# Phase SH5 — Verhaltens-Kerne + Gegner-Kauf-KI + Gegner-Auslöse-KI

### Task SH5.1: Verhaltens-Kerne
**Files:** Create `src/enemy/behaviorCore.ts`, `.test.ts`.
- [ ] **Test:** `CORES` (aggressor/ueberlebens/jaeger/duellant/pluenderer) liefern je `{id,name,traitMods,buyer:'enemy',category:'equipment',slot:'kern'}`. `applyCore(traits, coreId)` modifiziert Trait-Profil deterministisch (z. B. aggressor +aggression −vorsicht).
- [ ] **Implementieren:** Kern-Definitionen + `applyCore`.
- [ ] Test grün, `tsc` clean, **commit**: `SH5.1: Verhaltens-Kerne`.

### Task SH5.2: Gegner-Kauf-KI (Priorität + Budget)
**Files:** Create `src/enemy/enemyBuyAI.ts`, `.test.ts`; Modify `src/enemy/enemyShopping.ts`.
- [ ] **Test:** `chooseEnemyPurchase(state, rng)` über `buyer∈{enemy,both}`-Items mit Budget: Priorität Level-Up → Auto-Turret (wenn keins) → Dodge/Armor-Modul → Verhaltens-Kern (wenn keiner) → seltenes Equip → Consumable-Ladung. Respektiert **Budget-Deckel** pro Besuch (`maxSpend`). Gibt Liste gekaufter Items + Restcredits zurück. Genug Credits → kauft mehrere bis Deckel; arm → nichts.
- [ ] **Implementieren:** Politik als reine Funktion; `runEnemyShopVisit` ruft sie (statt nur Level-Up): verkauft Tasche (wie bisher), dann `chooseEnemyPurchase`, wendet Käufe auf `equipment`/`autoTurret`/`kern`/Belt/Stats an.
- [ ] Test grün, `tsc` clean, **commit**: `SH5.2: Gegner-Kauf-KI`.

### Task SH5.3: Gegner-Auslöse-KI (Consumables zünden)
**Files:** Create `src/enemy/enemyTriggerAI.ts`, `.test.ts`.
- [ ] **Test:** `chooseTrigger(situation, belt)` → Index der zu zündenden Ladung oder `null`. Regeln: HP<25% → Heilung/Panzerhaut/Letzte-Schicht; Ziel flieht & nah → Tempo-/Munition-Booster; mehrere Gegner nah → Rauch/AoE; sonst null. Deterministisch testbar.
- [ ] **Implementieren:** reine Politik über Situations-Snapshot (`{hpFrac, targetDist, targetFleeing, enemiesNear}`).
- [ ] Test grün, `tsc` clean, **commit**: `SH5.3: Gegner-Auslöse-KI`.

### Task SH5.4: Gegner-Buffs/Belt + Tell + Verdrahtung
**Files:** Modify `src/enemy/enemy.ts`, `src/main.ts`, `src/ui/enemyBars.ts`.
- [ ] **Implementieren:**
  - Gegner-Entität: eigener `buffStack`, `belt`, `kern`, optional `autoTurret`. Im Loop pro Gegner `buffStack.tick`, Stats lesen gebuffte Werte; `enemyTriggerAI.chooseTrigger` → Ladung zünden → Buff/Effekt.
  - Kauf-KI (SH5.2) füllt Belt/Equip beim Shop-Besuch.
  - **Tell (Lesbarkeit):** aufgerüsteter Gegner bekommt sichtbares Zeichen — Icon/Badge über dem Panzer (in `enemyBars`: kleine Symbole für „hat Auto-Turret / aktiver Buff / Verhaltens-Kern"), damit man erkennt „der hat geshoppt". Mesh-Tint optional.
  - `inspectCard` zeigt jetzt echte „Aktive Booster" + Verhaltens-Kern.
  - `__dbg`: `enemyLoadout(id)` inkl. kern/autoTurret/belt/buffs.
- [ ] **Browser-Verifikation:** Per `__dbg` einen reichen Gegner zum Shop schicken → er kauft (Auto-Turret/Modul/Kern, Credits sinken, Budget-Deckel hält), Tell erscheint über ihm; im Kampf zündet er bei niedrigem HP ein Heil-Item (HP steigt, Buff im Inspect sichtbar). Gegner-Hort sinkt nachweislich (Lvl-10-Gegner geben Credits aus). Screenshot. Keine Konsolenfehler.
- [ ] **commit**: `SH5.4: Gegner shoppen & zünden autonom (Hort geschlossen)`.

---

# Phase SH6 — Drama-Sinks: Nemesis · Verträge · Garage · Trophäenwand

### Task SH6.1: Nemesis-Dienste
**Files:** Create `src/shop/services.ts`, `.test.ts`; Modify `src/main.ts` (Promotion/Respawn/Drop-Hooks).
- [ ] **Test:** `SERVICES` (Provokationssignal, Kopfgeld, Feindakte, Beobachter-Drohne) je `{kind:'service', buyer:'player', category:'nemesis', cost, effect}`. `applyService(id, world)` mutiert Welt-Flags: Provokationssignal → `promotionChanceBonus` + `uniqueDropChanceBonus`; Kopfgeld(id) → markiert Rivale (häufiger, bessere Belohnung); Feindakte(id) → schaltet Schwächen-Anzeige in Inspect frei; Beobachter → mehr Historie.
- [ ] **Implementieren:** Dienste + Welt-Flags; Promotion-/Drop-Code liest die Boni (`istKnapperSieg`-Schwelle/Promotion-Chance + Drop-Tabelle).
- [ ] **Browser:** Provokationssignal kaufen → nächster knapper Sieg promotet häufiger / Unique-Drop-Chance hoch (statistisch über mehrere `smite`+Heal-Zyklen sichtbar). `tsc`/Tests grün. **commit**: `SH6.1: Nemesis-Dienste`.

### Task SH6.2: Verträge
**Files:** Create `src/shop/contracts.ts`, `.test.ts`; Modify `src/main.ts`.
- [ ] **Test:** `CONTRACTS` (Schrotthändler, Militär-Test, Arena-Sponsor, Bergungsfirma, Schwarzmarkt-Pakt) als umschaltbare Modifikatoren `{onCredits, onLoot, onEnemyStrength, …}`. `activeContractMods(active)` aggregiert.
- [ ] **Implementieren:** Vertrags-Toggle (Kauf = aktivieren, kostet/zahlt); Wirtschafts-/Spawn-Code liest aggregierte Mods.
- [ ] **Browser:** Bergungsfirma aktiv → mehr Loot/Credits messbar; Militär-Test → Gegner stärker. **commit**: `SH6.2: Verträge`.

### Task SH6.3: Trophäenwand
**Files:** Create `src/meta/trophyWall.ts`, `.test.ts`; Modify `src/main.ts` (onDeath benannter Rivale), `src/shop/shop.ts` (Anzeige).
- [ ] **Test:** `createTrophyWall()` — `record(named)` legt besiegten Rivalen ab (einmalig je id); `bonuses()` summiert kleine dauerhafte Boni (z. B. +1% Schaden je Trophäe, gedeckelt); `list()` für Anzeige.
- [ ] **Implementieren:** Bei endgültigem Sieg über einen benannten Rivalen (Spieler-Kill) → `trophyWall.record`; Spieler-Stats addieren `bonuses()`. (Hinweis: benannte Rivalen kehren zurück — Trophäe erst, wenn sie *nicht* mehr zurückkehren, z. B. nach N Niederlagen oder via „endgültig"-Flag; Schwelle hier definieren: Trophäe bei 3. Niederlage des Rivalen.)
- [ ] **Browser:** Rivale 3× besiegt → erscheint an der Wand, Spieler-Bonus aktiv (messbar). **commit**: `SH6.3: Trophäenwand`.

### Task SH6.4: Garage-Ausbau + Unique-Items + GUI
**Files:** Create `src/shop/garage.ts`, `.test.ts`; Modify `src/shop/shop.ts`, `src/main.ts`.
- [ ] **Test:** `GARAGE` (Zweiter Loadout-Platz, Ersatzteillager = Usables billiger, Werkbank MK+ = Item verbessern, Analyse-Terminal, Schwarzmarkt-Zugang, Notfall-Reparatur) als dauerhafte Käufe mit `applyGarage`-Effekten; Unique-Item-Generator `rollUnique(origin, rng)` (seltener, sichtbar markiert) gekoppelt an `uniqueDropChanceBonus` aus SH6.1.
- [ ] **Implementieren:** Garage-Effekte + Unique-Generierung im Drop-/Promotion-Pfad; GUI-Reiter „garage"/„nemesis"/„contracts" mit Klartext „Was tu ich / was kostet es" (Gate). Schwarzmarkt-Zugang schaltet rotierendes Sonderangebot frei.
- [ ] **Browser:** Garage-Kauf wirkt dauerhaft (z. B. Ersatzteillager → Usables billiger); Unique-Drop erscheint markiert. Alle 6 Reiter befüllt & klickbar. Screenshot. **commit**: `SH6.4: Garage + Unique-Items + Drama-GUI`.

---

## Abnahme (Gesamt)
- Alle Unit-Tests grün, `tsc` clean, keine Konsolenfehler.
- Browser-belegt: M/I, Sofort-Booster, Auto-Turrets (beide Seiten), volles Loadout, Gegner shoppen+zünden autonom mit Tell, Nemesis-Dienste/Verträge/Garage/Trophäen.
- **Credit-Senke gelöst:** Spieler *und* Gegner geben Credits laufend aus (Verbrauch + Drama + Garage); kein Hort-Stau mehr (Lvl-10-Gegner messbar ärmer als vorher).

---

## Selbst-Review (gegen Spec & Konversation)

**Abdeckung:** Inspizier-Spec (M/I) → P0 ✓. Shop-Cluster aus der Konversation: Sofort-Booster → SH2/SH3.6 ✓; Einsatz-Items → SH4.4 ✓; neue Slots mit Identität (Sekundär/Zusatzpanzerung/Systemmodul/Kern) → SH3.4/SH4 ✓; Auto-Turrets + Accuracy/Dodge → SH3 ✓; Verhaltens-Kerne **gegner-only** → SH5.1 ✓; Käufer-Tags → SH1.1 ✓; Gegner-Kauf-KI → SH5.2 ✓; Gegner-Auslöse-KI (Consumables) → SH5.3/5.4 ✓; Tell/Budget-Deckel → SH5.4 ✓; Nemesis-Dienste → SH6.1 ✓; Verträge → SH6.2 ✓; Trophäenwand → SH6.3 ✓; Garage + Unique + Schwarzmarkt → SH6.4 ✓; volle Slot-Tiefe → SH3.4+SH4.3 ✓; 6 Kategorie-Reiter → SH1.3/1.4 + SH4.5 + SH6.4 ✓.

**Typ-Konsistenz:** `Buyer/ItemKind/Category` (SH1.1) durchgängig; Slot-Liste additiv erweitert (P0→SH3.4→SH4.3); `buffStack` von Spieler (SH2.6) und Gegner (SH5.4) geteilt; `accuracy/dodge` in Math (SH3.1) → combat (SH3.2/SH4.2) → stats (SH3.4) → inspect (P0.2 liest neue Felder automatisch).

**Vorsysteme platziert:** Turm-Slew (SH2.2) vor Turmservo-Booster; Accuracy (SH3.1) vor Debuff-Boostern (SH3.6); Trefferrichtung (SH4.1) vor Zusatzpanzerung (SH4.2).
