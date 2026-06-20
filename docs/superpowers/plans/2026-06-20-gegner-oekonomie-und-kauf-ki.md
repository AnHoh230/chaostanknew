# Gegner-Ökonomie & Kauf-KI — Implementierungsplan

> **Für agentische Worker:** Umsetzung Task-für-Task. Schritte mit `- [ ]`-Checkboxen.

**Ziel:** Gegner folgen derselben Ökonomie wie der Spieler (Startgeld = teuerstes Item der MK, Geld+XP über Kills, MK-Aufstieg via Progression, Heuristik-Einkauf, Consumable-Einsatz-KI, Shop-Trip-State-Machine mit Anfangs-Shopping).

**Architektur:** Reine, getestete Logik-Module (`catalog`-Helfer, `enemyEconomy`) + Verdrahtung in `main.ts`. Ersetzt das alte `enemyShopping.ts`-Modell.

**Tech Stack:** TypeScript (strict ESM), Vitest, Babylon.js.

**Spec:** `docs/superpowers/specs/2026-06-20-gegner-oekonomie-und-kauf-ki-design.md`

---

## Dateistruktur

- `src/shop/catalog.ts` — **erweitern:** `mostExpensiveItemPrice`, `cheapestItemPrice`, `itemsForSlotMk`.
- `src/progression/progression.ts` — **erweitern:** `createProgression(startLevel = 1)`.
- `src/enemy/enemyEconomy.ts` — **neu:** `planPurchases`, `shouldStartShopTrip`, `pickBoosterToUse` (rein).
- `src/enemy/enemy.ts` — **umbauen:** `prog`/`belt`/`buffs`/`shopState`-Felder, `level`/`enemyLevelStats` raus.
- `src/enemy/enemyShopping.ts` + Test — **löschen.**
- `src/main.ts` — **verdrahten:** Startgeld, Kill-XP, State-Machine, Booster-Einsatz.

---

## Task 1: Katalog-Preis-Helfer

**Files:**
- Modify: `src/shop/catalog.ts`
- Test: `src/shop/catalog.test.ts`

- [ ] **Step 1: Test schreiben** (an `catalog.test.ts` anhängen)

```ts
import { mostExpensiveItemPrice, cheapestItemPrice, itemsForSlotMk } from './catalog';

describe('Preis-Helfer', () => {
  it('teuerstes/billigstes MK1-Normal-Item', () => {
    expect(mostExpensiveItemPrice(1)).toBe(138); // Waffe
    expect(cheapestItemPrice(1)).toBe(88); // Räder
  });
  it('itemsForSlotMk liefert normal+selten eines Slots/MK', () => {
    const items = itemsForSlotMk('waffe', 1);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.slot === 'waffe' && i.mk === 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `cd ChaosTankNew && npx vitest run src/shop/catalog.test.ts`
Erwartet: FAIL („mostExpensiveItemPrice is not a function").

- [ ] **Step 3: Helfer implementieren** (in `catalog.ts`, nach `cloneItem`)

```ts
/** Teuerstes Normal-Equip einer MK (über die 5 Formel-Slots). */
export function mostExpensiveItemPrice(mk: number): number {
  return Math.max(...SLOTS.map((s) => s.prices[mk - 1]!));
}

/** Billigstes Normal-Equip einer MK. */
export function cheapestItemPrice(mk: number): number {
  return Math.min(...SLOTS.map((s) => s.prices[mk - 1]!));
}

/** Alle Katalog-Items eines Slots in einer MK (normal + selten). */
export function itemsForSlotMk(slot: Slot, mk: number): ShopItem[] {
  return CATALOG.filter((it) => it.slot === slot && it.mk === mk);
}
```

- [ ] **Step 4: Test grün**

Run: `cd ChaosTankNew && npx vitest run src/shop/catalog.test.ts`
Erwartet: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shop/catalog.ts src/shop/catalog.test.ts
git commit -m "feat(catalog): Preis-Helfer (teuerstes/billigstes/itemsForSlotMk)"
```

---

## Task 2: Progression mit Start-Level

**Files:**
- Modify: `src/progression/progression.ts`
- Test: `src/progression/progression.test.ts`

- [ ] **Step 1: Test anhängen**

```ts
it('createProgression(startLevel) startet auf dem Level', () => {
  const p = createProgression(3);
  expect(p.level).toBe(3);
  expect(p.unlockedMk()).toBe(unlockedMkForLevel(3));
});
```
(`createProgression`, `unlockedMkForLevel` ggf. zum Import ergänzen.)

- [ ] **Step 2: Rot** — Run: `cd ChaosTankNew && npx vitest run src/progression/progression.test.ts` → FAIL.

- [ ] **Step 3: Implementieren** — Signatur ändern:

```ts
export function createProgression(startLevel = 1): Progression {
  const state = {
    level: startLevel,
    xp: 0,
    // ... Rest unverändert ...
```

- [ ] **Step 4: Grün** — Run: `cd ChaosTankNew && npx vitest run src/progression/progression.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/progression/progression.ts src/progression/progression.test.ts
git commit -m "feat(progression): optionales Start-Level"
```

---

## Task 3: enemyEconomy — planPurchases

**Files:**
- Create: `src/enemy/enemyEconomy.ts`
- Test: `src/enemy/enemyEconomy.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { planPurchases } from './enemyEconomy';
import { catalogItem } from '../shop/catalog';

describe('planPurchases', () => {
  it('verkauft Beute und kauft max. 2 Equip-Teile für leere Slots', () => {
    const r = planPurchases({ credits: 400, equipment: [], mk: 1, bag: [], beltFree: 3 });
    expect(r.soldFromBag).toBe(0);
    expect(r.bought).toBe(2); // max 2 pro Trip
    expect(r.equipment).toHaveLength(2);
    expect(r.credits).toBeLessThan(400);
  });

  it('Beute fließt als Credits ein', () => {
    const bag = [catalogItem('waffe_mk03_selten')];
    const r = planPurchases({ credits: 0, equipment: [], mk: 1, bag, beltFree: 3 });
    expect(r.soldFromBag).toBe(1);
  });

  it('voll für MK → kauft Booster statt Equip', () => {
    const full = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung']
      .map((s) => catalogItem(`${s}_mk01_normal`));
    const r = planPurchases({ credits: 500, equipment: full, mk: 1, bag: [], beltFree: 3 });
    expect(r.bought).toBe(0);
    expect(r.boostersBought.length).toBeGreaterThan(0);
  });

  it('kein bezahlbares Teil → kein Kauf', () => {
    const r = planPurchases({ credits: 10, equipment: [], mk: 1, bag: [], beltFree: 3 });
    expect(r.bought).toBe(0);
  });
});
```

- [ ] **Step 2: Rot** — Run: `cd ChaosTankNew && npx vitest run src/enemy/enemyEconomy.test.ts` → FAIL.

- [ ] **Step 3: Implementieren**

```ts
import { cloneItem, itemsForSlotMk, cheapestItemPrice, type ShopItem, type Slot } from '../shop/catalog';
import { sellValue } from '../shop/buyLogic';
import { BOOSTERS, type BoosterDef } from '../shop/boosters';

const EQUIP_SLOTS: Slot[] = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'];
const MAX_BUYS_PER_TRIP = 2;

export interface EnemyBuyState {
  credits: number;
  equipment: readonly ShopItem[]; // angelegt, je Slot max 1
  mk: number;
  bag: readonly ShopItem[];
  beltFree: number;
}
export interface EnemyBuyResult {
  credits: number;
  equipment: ShopItem[];
  boostersBought: BoosterDef[];
  soldFromBag: number;
  bought: number;
}

/** Bestes bezahlbares Normal-Equip eines Slots in der MK (höchster Preis ≤ Budget). */
function bestAffordableForSlot(slot: Slot, mk: number, budget: number): ShopItem | null {
  let best: ShopItem | null = null;
  for (const it of itemsForSlotMk(slot, mk)) {
    if (it.rarity !== 'normal') continue;
    if (it.cost <= budget && (!best || it.cost > best.cost)) best = it;
  }
  return best;
}

function weakestSlot(equipped: Map<Slot, ShopItem>): Slot {
  for (const s of EQUIP_SLOTS) if (!equipped.has(s)) return s; // leer zuerst
  let weakest = EQUIP_SLOTS[0]!;
  for (const s of EQUIP_SLOTS) {
    if (equipped.get(s)!.cost < equipped.get(weakest)!.cost) weakest = s;
  }
  return weakest;
}

function fullyEquippedForMk(equipped: Map<Slot, ShopItem>, mk: number): boolean {
  return EQUIP_SLOTS.every((s) => {
    const it = equipped.get(s);
    return it != null && it.mk >= mk;
  });
}

export function planPurchases(s: EnemyBuyState): EnemyBuyResult {
  let credits = s.credits;
  const soldFromBag = s.bag.length;
  for (const it of s.bag) credits += sellValue(it);

  const equipped = new Map<Slot, ShopItem>();
  for (const it of s.equipment) equipped.set(it.slot, it);

  let bought = 0;
  while (bought < MAX_BUYS_PER_TRIP && !fullyEquippedForMk(equipped, s.mk)) {
    const slot = weakestSlot(equipped);
    const item = bestAffordableForSlot(slot, s.mk, credits);
    if (!item) break;
    const cur = equipped.get(slot);
    if (cur && item.cost <= cur.cost) break; // verbessert nichts
    credits -= item.cost;
    equipped.set(slot, cloneItem(item));
    bought++;
  }

  const boostersBought: BoosterDef[] = [];
  if (fullyEquippedForMk(equipped, s.mk)) {
    let free = s.beltFree;
    const buyable = BOOSTERS
      .filter((b) => b.buyer === 'both' || b.buyer === 'enemy')
      .slice()
      .sort((a, b) => a.cost - b.cost);
    for (const b of buyable) {
      if (free <= 0) break;
      if (credits < b.cost) continue;
      credits -= b.cost;
      boostersBought.push(b);
      free--;
    }
  }

  const equipment = EQUIP_SLOTS.filter((s2) => equipped.has(s2)).map((s2) => equipped.get(s2)!);
  return { credits, equipment, boostersBought, soldFromBag, bought };
}

// cheapestItemPrice wird in Task 4 genutzt — Import hier schon bereitgestellt.
export { cheapestItemPrice };
```

- [ ] **Step 4: Grün** — Run: `cd ChaosTankNew && npx vitest run src/enemy/enemyEconomy.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/enemy/enemyEconomy.ts src/enemy/enemyEconomy.test.ts
git commit -m "feat(enemyEconomy): planPurchases (Heuristik-Einkauf + Booster bei voll)"
```

---

## Task 4: enemyEconomy — shouldStartShopTrip + pickBoosterToUse

**Files:**
- Modify: `src/enemy/enemyEconomy.ts`
- Test: `src/enemy/enemyEconomy.test.ts`

- [ ] **Step 1: Test anhängen**

```ts
import { shouldStartShopTrip, pickBoosterToUse } from './enemyEconomy';
import { boosterDef } from '../shop/boosters';

describe('shouldStartShopTrip', () => {
  it('genug Geld & nicht im Kampf → true', () => {
    expect(shouldStartShopTrip({ credits: 1000, mk: 1, inCombat: false })).toBe(true);
  });
  it('im Kampf → nie', () => {
    expect(shouldStartShopTrip({ credits: 1000, mk: 1, inCombat: true })).toBe(false);
  });
  it('zu wenig Geld → false', () => {
    expect(shouldStartShopTrip({ credits: 50, mk: 1, inCombat: false })).toBe(false);
  });
});

describe('pickBoosterToUse', () => {
  const heal = boosterDef('panzerhaut_schaum');
  const flee = boosterDef('notstrom_zuender');
  it('wenig HP → Heil-Booster-Index', () => {
    expect(pickBoosterToUse([flee, heal, null], { hpFrac: 0.1, inCombat: true, mode: 'feuern' })).toBe(1);
  });
  it('fliehen → Notstrom-Zünder', () => {
    expect(pickBoosterToUse([flee, null, null], { hpFrac: 0.9, inCombat: false, mode: 'fliehen' })).toBe(0);
  });
  it('nichts Passendes → -1', () => {
    expect(pickBoosterToUse([null, null, null], { hpFrac: 1, inCombat: false, mode: 'scout' })).toBe(-1);
  });
});
```

- [ ] **Step 2: Rot** — Run: `cd ChaosTankNew && npx vitest run src/enemy/enemyEconomy.test.ts` → FAIL.

- [ ] **Step 3: Implementieren** (an `enemyEconomy.ts` anhängen)

```ts
export interface ShopTripCtx { credits: number; mk: number; inCombat: boolean; }
export function shouldStartShopTrip(c: ShopTripCtx): boolean {
  if (c.inCombat) return false;
  return c.credits >= 2 * cheapestItemPrice(c.mk);
}

export interface UseCtx { hpFrac: number; inCombat: boolean; mode: string; }
/** Index des zu zündenden Gürtel-Slots oder -1. */
export function pickBoosterToUse(belt: readonly (BoosterDef | null)[], ctx: UseCtx): number {
  const find = (id: string) => belt.findIndex((b) => b?.id === id);
  if (ctx.hpFrac < 0.25) {
    const i = find('panzerhaut_schaum'); if (i >= 0) return i;
    const j = find('letzte_schicht'); if (j >= 0) return j;
  }
  if (ctx.mode === 'fliehen') {
    const i = find('notstrom_zuender'); if (i >= 0) return i;
  }
  if (ctx.inCombat) {
    const i = find('ueberdruck_munition'); if (i >= 0) return i;
    const j = find('kuehlmittel_injektion'); if (j >= 0) return j;
  }
  return -1;
}
```

- [ ] **Step 4: Grün** — Run: `cd ChaosTankNew && npx vitest run src/enemy/enemyEconomy.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/enemy/enemyEconomy.ts src/enemy/enemyEconomy.test.ts
git commit -m "feat(enemyEconomy): shouldStartShopTrip + pickBoosterToUse"
```

---

## Task 5: Enemy-Datenmodell umbauen

**Files:**
- Modify: `src/enemy/enemy.ts`
- Delete: `src/enemy/enemyShopping.ts`, `src/enemy/enemyShopping.test.ts`

- [ ] **Step 1:** In `enemy.ts` Imports ergänzen, `enemyLevelStats` entfernen, Interface ändern:

```ts
import { createProgression, type Progression } from '../progression/progression';
import { createBelt, type Belt } from '../player/belt';
import { createBuffStack, type BuffStack } from '../combat/buffs';
import type { BoosterDef } from '../shop/boosters';

export type EnemyShopState = 'kaempfen' | 'streifen' | 'shop_anfahrt' | 'shop_dwell';
```

Im `Enemy`-Interface: `level: number` **ersetzen** durch:

```ts
  prog: Progression;        // eigenes Level/XP/MK — wie der Spieler
  belt: Belt<BoosterDef>;   // gekaufte Consumables
  buffs: BuffStack;         // aktive Booster-Buffs
  shopState: EnemyShopState;
  dwellTimer: number;       // Sekunden Rest am Shop-Feld
  beltCd: number;           // Sperre bis zur nächsten Zündung
  overShots: number;        // Überdruck-Munition: Rest-Schüsse
  overMul: number;          // Überdruck-Munition: Schadens-Mult
```
`enemyLevelStats` (die ganze Funktion) **löschen**.

- [ ] **Step 2:** `applyEnemyStats` auf `prog.level` umstellen:

```ts
export function applyEnemyStats(e: Enemy): void {
  const st = enemyCombatStats(e.equipment, e.prog.level);
  // ... unverändert ...
}
```

- [ ] **Step 3:** In `createEnemyEntity` die Combatant-Stats und das Rückgabeobjekt anpassen. `enemyCombatStats(equipment, spec.level)` bleibt. Im Rückgabeobjekt `level: spec.level` **ersetzen** und neue Felder ergänzen:

```ts
  const prog = createProgression(spec.level);
  // ... combatant wie bisher (st aus enemyCombatStats(equipment, spec.level)) ...
  return {
    // ... id, view, combatant, traits, brain, home, fireCd, action, named,
    //     displayName, prevTargetVisible unverändert ...
    prog,
    credits: 0,
    equipment,
    bag: [],
    shopGoal: null,
    shopState: 'kaempfen',
    dwellTimer: 0,
    beltCd: 0,
    overShots: 0,
    overMul: 1,
    belt: createBelt<BoosterDef>(3),
    buffs: createBuffStack(),
    damage: st.damage,
    scoutDir: rng() * Math.PI * 2,
    scoutCd: 0,
    mode: 'scout',
  };
```
(`shopCd` entfällt — durch `shopState` ersetzt. `respawnTimer` bleibt, falls im Interface vorhanden.)

- [ ] **Step 4:** `enemyShopping.ts` und dessen Test löschen:

```bash
git rm src/enemy/enemyShopping.ts src/enemy/enemyShopping.test.ts
```

- [ ] **Step 5: tsc** — `cd ChaosTankNew && npx tsc --noEmit` → es werden Fehler in `main.ts` erwartet (nutzt `e.level`, `runEnemyShopVisit`, `shopCd`). Die behebt Task 6–8. Noch **nicht** committen.

---

## Task 6: Spieler-Startgeld + main.ts auf prog umstellen

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Startgeld.** `main.ts:212` `let geld = 0;` ersetzen:

```ts
let geld = mostExpensiveItemPrice(1); // Startbudget = teuerstes MK1-Item (symmetrisch zum Gegner)
```
Import ergänzen: `import { catalogItem, cloneItem, mostExpensiveItemPrice } from './shop/catalog';` (vorhandene catalog-Importe zusammenführen).

- [ ] **Step 2: `e.level`-Lesungen** auf `e.prog.level` umstellen. Betroffen (per Suche `e\.level`): die `__dbg`-Snapshots (`enemyInfoOf`, `enemyState`) und der Loot-Roll-Block (`mkStr` aus `enemyMk(e.level)` → `enemyMk(e.prog.level)`). Jede Fundstelle `e.level` → `e.prog.level`.

- [ ] **Step 3: tsc** — `cd ChaosTankNew && npx tsc --noEmit` → verbleibend nur noch `runEnemyShopVisit`/`shopCd`-Fehler (Task 8). Noch nicht committen.

---

## Task 7: Kill gibt dem Gegner-Sieger XP

**Files:**
- Modify: `src/main.ts` (Block `else { // Gegner-killt-Gegner` um Zeile 297–302)

- [ ] **Step 1:** Block ersetzen:

```ts
      } else {
        // Gegner-killt-Gegner: Sieger bekommt Credits UND XP (→ MK-Aufstieg wie Spieler).
        const killer = roster.find((r) => r.id === killerTeam);
        if (killer) {
          killer.credits += reward;
          const up = killer.prog.addXp(Math.round(18 + (e.combatant.lootValue ?? 0.4) * 60));
          if (up.newMkUnlocks.length) applyEnemyStats(killer); // neue MK → Stats frisch
        }
        log.debug('enemy killed enemy', { tot: e.id, sieger: killerTeam });
      }
```

- [ ] **Step 2: tsc** — unverändert (nur Task-8-Fehler offen).

---

## Task 8: Shop-Besuch über planPurchases (State-Machine-Kern)

**Files:**
- Modify: `src/main.ts` (Block `if (e.shopGoal) { ... runEnemyShopVisit ... }` ~888–906 und der `shopCd`-Block ~990–998)

- [ ] **Step 1: Imports.** `runEnemyShopVisit, enemyUpgradeCost` entfernen, ersetzen:

```ts
import { planPurchases, shouldStartShopTrip, pickBoosterToUse } from './enemy/enemyEconomy';
import { enemyMk } from './enemy/equipment';
```

- [ ] **Step 2: Konstanten** (bei den anderen Tuning-Konstanten):

```ts
const SHOP_DWELL = 2.5;        // Sekunden Einkaufs-Verweildauer am Feld
const ENEMY_INTERRUPT_HP = 0.2; // Störer unter dieser HP-Fraktion wird noch erledigt
const BELT_USE_CD = 4;          // Sperre zwischen zwei Zündungen
```

- [ ] **Step 3: Anfahrt-/Dwell-Block ersetzen.** Den alten `if (e.shopGoal)`-Block durch die State-Machine ersetzen:

```ts
      // — Shop-Trip-State-Machine —
      if (e.shopState === 'shop_anfahrt' && e.shopGoal) {
        const sgx = e.shopGoal.x - ex, sgz = e.shopGoal.z - ez;
        const sgd = Math.hypot(sgx, sgz);
        if (sgd <= TILE_RADIUS) {
          e.shopState = 'shop_dwell';
          e.dwellTimer = SHOP_DWELL;
        } else {
          // zum Feld fahren — gleiches Muster wie der bestehende Code:
          const step = ENEMY_SPEED * simDt;
          er.position.x += (sgx / sgd) * step;
          er.position.z += (sgz / sgd) * step;
          er.rotation.y = Math.atan2(sgx, sgz);
          e.combatant.x = er.position.x; e.combatant.z = er.position.z;
        }
      } else if (e.shopState === 'shop_dwell') {
        e.combatant.invulnerable = true; // Schutzzone am Feld
        e.dwellTimer -= simDt;
        if (e.dwellTimer <= 0) {
          const res = planPurchases({
            credits: e.credits,
            equipment: e.equipment,
            mk: e.prog.unlockedMk(),
            bag: e.bag,
            beltFree: e.belt.slots().filter((s) => s === null).length,
          });
          e.credits = res.credits;
          e.bag = [];
          if (res.bought > 0) { e.equipment = res.equipment; applyEnemyStats(e); }
          for (const b of res.boostersBought) e.belt.add(b);
          e.shopGoal = null;
          e.shopState = 'kaempfen';
          e.combatant.invulnerable = false;
        }
      }
```
`stepEnemyMove` ist der vorhandene Helfer, der die Wanne bewegt (gleiche Funktion wie im Engagement-Block; falls inline, denselben Bewegungscode verwenden).

- [ ] **Step 4: Trip-Auslöser ersetzen.** Den alten `shopCd`-Block (`e.shopCd -= simDt; if (...) ...`) ersetzen:

```ts
      // Trip starten, wenn genug Geld & gerade Ruhe (nur aus 'kaempfen'/'streifen')
      if (e.shopState === 'kaempfen' || e.shopState === 'streifen') {
        const inCombat = target != null && target.dist <= shotRange;
        if (shouldStartShopTrip({ credits: e.credits, mk: e.prog.unlockedMk(), inCombat })) {
          const t = shopField.nearest(ex, ez);
          if (t) { e.shopGoal = { x: t.x, z: t.z }; e.shopState = 'shop_anfahrt'; }
        }
      }
```
`nearestShopTile(x,z)` = vorhandener Helfer/`shopField`-Lookup (der alte Block nutzte ihn bereits; gleiche Quelle verwenden).

- [ ] **Step 5: Anfahrt-Unterbrechung.** Im Engagement-Auswertungsteil: wenn `e.shopState === 'shop_anfahrt'`, normales Engagement **überspringen** — außer ein Ziel ist in Reichweite UND `target.hpFrac < ENEMY_INTERRUPT_HP` (kaum HP): dann einmal feuern/erledigen, sonst weiter zum Shop. Konkret vor dem Engagement-Aufruf:

```ts
      const onShopTrip = e.shopState === 'shop_anfahrt' || e.shopState === 'shop_dwell';
      const weakIntruder = target != null && target.dist <= shotRange && targetHpFrac < ENEMY_INTERRUPT_HP;
      if (onShopTrip && !weakIntruder) {
        // Trip nicht unterbrechen → Engagement-Block auslassen (Bewegung macht die State-Machine)
      } else {
        // ... bestehender engagementStep(...)-Block ...
      }
```
(`targetHpFrac` aus dem Ziel-Combatant: `target ? tgtComb.hp / tgtComb.maxHp : 1`.)

- [ ] **Step 6: tsc + Tests** — `cd ChaosTankNew && npx tsc --noEmit && npx vitest run` → grün.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(enemy): Shop-Trip-State-Machine + planPurchases statt runEnemyShopVisit; Kill gibt XP"
```

---

## Task 9: Anfangs-Shopping beim Spawn

**Files:**
- Modify: `src/enemy/enemy.ts` (createEnemyEntity), `src/main.ts`

- [ ] **Step 1:** Frisch gespawnte Gegner ohne Erst-Ausrüstung, aber mit Startgeld, sofort auf Shop-Trip. In `createEnemyEntity`:

```ts
  const equipment = rollEnemyEquipment(spec.level, rng); // Basis bleibt — wird am ersten Shop ersetzt
```
ersetzen durch leeres Start-Gear + Startbudget:

```ts
  const equipment: ShopItem[] = []; // startet ohne Gear, rüstet sich am ersten Shop auf
```
und im Rückgabeobjekt:

```ts
    credits: mostExpensiveItemPrice(enemyMk(spec.level)),
    shopState: 'shop_anfahrt',
```
Imports ergänzen: `import { mostExpensiveItemPrice, type ShopItem } from '../shop/catalog';` und `import { enemyMk } from './equipment';`. `enemyCombatStats([], spec.level)` liefert dann Basis-HP/-Schaden (nackt) — der Gegner ist bis zum ersten Einkauf schwach, genau wie gewünscht.

- [ ] **Step 2:** In `main.ts` beim Spawn (Spawner-Callback) sicherstellen, dass `e.shopGoal` gesetzt wird, falls `shopState==='shop_anfahrt'` und noch kein Ziel:

```ts
      if (e.shopState === 'shop_anfahrt' && !e.shopGoal) {
        const t = shopField.nearest(e.combatant.x, e.combatant.z);
        if (t) e.shopGoal = { x: t.x, z: t.z };
      }
```
(Im Anfahrt-Block aus Task 8 Step 3 ggf. denselben Fallback ergänzen, damit ein Gegner ohne erreichbares Feld nicht hängen bleibt: kein Feld → `shopState='kaempfen'`.)

- [ ] **Step 3: tsc + Tests** → grün. Commit:

```bash
git add -A
git commit -m "feat(enemy): Anfangs-Shopping — spawnt nackt mit Startgeld, rüstet am ersten Shop auf"
```

---

## Task 10: Gegner zünden Booster (Einsatz-KI)

**Files:**
- Modify: `src/main.ts` (Gegner-Update-Schleife, Gegner-Feuer)

- [ ] **Step 1: Booster-Effekt auf Gegner anwenden.** Helfer in `boot()` (analog zu `applyBooster`, aber auf `e`):

```ts
  function applyEnemyBooster(e: Enemy, def: BoosterDef): void {
    const eff = def.effect;
    if (eff.kind === 'buff') {
      if (eff.onlyLowHp && e.combatant.hp / e.combatant.maxHp >= 0.2) { e.belt.add(def); return; }
      e.buffs.add({ ...eff.buff, label: def.name });
    } else if (eff.kind === 'tempHp') {
      e.combatant.hp = Math.min(e.combatant.maxHp, e.combatant.hp + eff.amount);
    } else if (eff.kind === 'nextShots') {
      e.overShots = eff.shots; e.overMul = eff.damageMul;
    }
    alog.log('enemy.booster', { id: e.id, booster: def.id });
  }
```

- [ ] **Step 2: Im Gegner-Update** (nach Engagement, vor Feuer) Buffs ticken + Einsatz-KI:

```ts
      e.buffs.tick(simDt);
      e.beltCd = Math.max(0, e.beltCd - simDt);
      if (e.beltCd <= 0 && e.belt.count() > 0) {
        const inCombat = e.mode === 'feuern' || e.mode === 'abstand';
        const idx = pickBoosterToUse(e.belt.slots(), {
          hpFrac: e.combatant.hp / e.combatant.maxHp, inCombat, mode: e.mode,
        });
        if (idx >= 0) {
          const def = e.belt.trigger(idx);
          if (def) { applyEnemyBooster(e, def); e.beltCd = BELT_USE_CD; }
        }
      }
```

- [ ] **Step 3: Buff-Mods in Gegner-Bewegung/-Feuer einrechnen.** Beim Bewegen `speedMul`, beim Feuern `damageMul`/`fireRateMul` und Überdruck anwenden:

```ts
      const m = e.buffs.aggregate();
      // Bewegung: vorhandenes Tempo × m.speedMul
      // Feuer-Cooldown: ENEMY_FIRE_COOLDOWN / m.fireRateMul
      // Schadensberechnung enemyFire: dmg = e.damage * m.damageMul * (e.overShots > 0 ? e.overMul : 1)
      //   und nach dem Schuss: if (e.overShots > 0) e.overShots--;
```
Konkret die `enemyFire`-Aufrufstelle so anpassen, dass der Schaden `e.damage * m.damageMul * (e.overShots > 0 ? e.overMul : 1)` ist und `e.overShots` nach dem Schuss dekrementiert wird; den Feuer-Cooldown durch `m.fireRateMul` teilen; die Bewegungsdistanz mit `m.speedMul` multiplizieren. (`armorAdd` optional: `e.combatant.armor` temporär — kann später, hier YAGNI.)

- [ ] **Step 4: tsc + Tests** → grün. Commit:

```bash
git add -A
git commit -m "feat(enemy): Consumable-Einsatz-KI — Gegner zünden Booster nach HP/Modus"
```

---

## Task 11: Abnahme + Tech-Debt aktualisieren

**Files:**
- Modify: `docs/TECH-DEBT.md`

- [ ] **Step 1: Browser-Beweis** (`npm run dev`, `__dbg`):
  - Spieler startet mit `geld === mostExpensiveItemPrice(1)` (138) und leerem Loadout.
  - Frischer Gegner: `__dbg.enemyState(id)` zeigt `shopState:'shop_anfahrt'`, `equipment.length:0`, `credits>0`; nach Erreichen eines Felds + 2,5 s → `equipment.length` steigt, `credits` sinkt.
  - Gegner mit XP: zwei Kills → `prog.level`/`unlockedMk` steigt; bei MK-Up frische Stats.
  - Voll ausgerüsteter Gegner kauft Booster → `belt`-Slots gefüllt; bei <25 % HP zündet er (`enemy.booster`-Log).
  - Anfahrt wird nicht von vollen Gegnern unterbrochen, aber ein <20 %-HP-Störer wird erledigt.

- [ ] **Step 2: TECH-DEBT.md** — TD-3 (`enemyLevelStats` toter Code) als **erledigt** streichen; TD-4 (Level/MK doppelt) auf „für Gegner gelöst (Progression), Spieler-Seite folgt" aktualisieren. Offen vermerken: Gegner-`armorAdd`-Buff nicht eingerechnet (Task 10 YAGNI), Auto-Turret-Käufe der Gegner (sekundaer) noch nicht in der Heuristik.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: TECH-DEBT nach Gegner-Oekonomie-Umbau aktualisiert"
```

---

## Selbst-Review (vor Ausführung)

- **Spec-Deckung:** Startgeld (T1/T6), XP→MK (T2/T7), Heuristik-Kauf (T3/T8), Consumables-bei-voll (T3/T10), Einsatz-KI (T4/T10), State-Machine + Anfangs-Shopping + Unterbrechung (T8/T9). ✓
- **Typen-Konsistenz:** `planPurchases`-Felder (`credits/equipment/mk/bag/beltFree`) identisch in T3-Test, T3-Impl und T8-Aufruf. `pickBoosterToUse(belt, ctx)` identisch T4/T10. ✓
- **Platzhalter:** keine TODO/TBD; main.ts-Schritte verweisen auf vorhandene Helfer (`stepEnemyMove`/`nearestShopTile`) statt sie zu erfinden — beim Ausführen die echten Namen aus dem bestehenden Block übernehmen.
