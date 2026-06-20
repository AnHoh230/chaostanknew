# Gegner-Ökonomie & Kauf-KI — Redesign (Spec)

**Datum:** 2026-06-20
**Status:** zur Abnahme

## Ziel

Gegner und Spieler folgen **derselben Ökonomie**: gleiches Startgeld, Geld über
Kills, XP→MK-Aufstieg, Einkauf im Shop (Gegner per Heuristik, Spieler manuell).
Ersetzt das alte, nie abgestimmte „Level +1 → alle 5 Teile neu würfeln"-Modell
durch ein nachvollziehbares Kauf-/Verhaltensmodell.

## Was rausfliegt (Altlast)

- `enemyShopping.ts`: `runEnemyShopVisit` (Level +1 + 5 Teile neu) und
  `enemyUpgradeCost` — komplett ersetzt.
- `enemy.ts`: das eigenständige `level: number` als Treiber + `enemyLevelStats`
  (toter Code, TD-3) — Gegner-Level/MK kommen künftig aus einer `Progression`.
- Der Debug-Seed „bag bekommt 2 Gratis-Items" bleibt (nur `__dbg`).

## Kern-Datenmodell

- Jeder Gegner bekommt eine **eigene `Progression`** (`createProgression()`,
  identisch zum Spieler). `enemy.level`, `enemy.xp`, MK kommen daraus.
- **Gegner-MK = `prog.unlockedMk()`** (alle 2 Level eine Stufe, gedeckelt MK10).
  Ausrüstung & Käufe nutzen diese MK.
- `enemy.credits` bleibt das Spielgeld.

## Startgeld (beide gleich)

- Neuer Katalog-Helper `mostExpensiveItemPrice(mk)` = teuerstes **Normal**-Item
  der MK. **MK1 = 138** (Turm), billigstes MK1 = 88 (Wanne).
- **Spieler:** startet mit `geld = mostExpensiveItemPrice(1)` (= 138), leeres
  Loadout, kauft manuell im Schutzbereich. (Ersetzt „startet komplett nackt".)
- **Gegner:** startet mit `credits = mostExpensiveItemPrice(seineMK)` und kauft die
  **Erstausrüstung sofort beim Erscheinen** (`planPurchases`, kein Shop-Feld nötig).

**Erscheinen = 5 s Gnadenzeit (Spieler & Gegner, QoL-Update 2026-06-20):** Wer spawnt
oder respawnt, ist **5 s unverwundbar** und kann **sofort shoppen, ohne auf einem Feld
zu stehen** (Spieler: Werkstatt überall per „b"; Gegner: Sofortkauf beim Spawn).
**Danach** gilt wieder die normale Regel — zum Shop-Feld fahren. Ersetzt das frühere
„erst zum Shop fahren"-Anfangs-Shopping.

## Geld & XP verdienen

- Kill-Reward (Credits) wie bisher: `round(lootValue × 120)`. Sieger bekommt es
  (Spieler → `geld`, Gegner → `credits`).
- **NEU:** ein Kill gibt dem Gegner-Sieger auch **XP** — gleiche Formel wie der
  Spieler (`round(18 + lootValue × 60)`) via `enemy.prog.addXp(...)`. Dadurch
  steigt seine MK genau wie beim Spieler. Spieler-Logik bleibt unverändert.

## Kauf-Heuristik (Gegner) — `planPurchases(state, rng)` (rein, getestet)

Eingang: `credits`, `equipment` (Slot→Item|leer), `mk`, `bag`.

1. **Beute verkaufen:** alle `bag`-Teile → `credits += sellValue(it)`.
2. **Ausrüstung kaufen**, solange Budget reicht und **nicht „voll für MK"**:
   - Wähle den **schwächsten Slot**: leerer Slot zuerst, sonst der Slot mit dem
     **günstigsten angelegten Item** (Item-Preis als Stärke-Proxy).
   - Kaufe das **teuerste bezahlbare Normal-Item dieses Slots in seiner MK**.
   - **Max. 2 Käufe pro Trip** (entspricht „ersetzt 2 Items").
3. **„Voll für MK"** = alle 5 Equip-Slots tragen ein Item der **aktuellen** MK.
   Dann statt Ausrüstung **Consumables** (Booster, `buyer` `both`/`enemy`) in den
   Gürtel kaufen, solange Budget reicht und ein Gürtel-Slot frei ist.

Ausgang: neue `equipment`, neue Gürtel-Ladungen, Rest-`credits`, geleerte `bag`.

## Consumable-Einsatz-KI (Gegner) — `pickBoosterToUse(beltSlots, ctx)` (rein, getestet)

Kontext: `hpFrac`, `inCombat`, `mode` (aus Engagement).
Regeln nach Priorität (erste passende zündet):

| Bedingung | Booster |
|---|---|
| `hpFrac < 0.25` | `panzerhaut_schaum` → sonst `letzte_schicht` |
| `mode === 'fliehen'` | `notstrom_zuender` |
| `inCombat` (feuern/abstand) | `ueberdruck_munition` → sonst `kuehlmittel_injektion` |
| sonst | nichts |

Effekt über das vorhandene Buff-/Belt-System (SH2.x) — **symmetrisch zum Spieler**.
Pro Tick max. 1 Zündung, danach kurze interne Sperre (z. B. 4 s), damit er nicht
alles auf einmal verbraucht.

## Shop-Trip-State-Machine (Gegner)

Zustände: `kaempfen` · `streifen` (scout) · `shop_anfahrt` · `shop_dwell`.

- **Trip-Auslöser:** `credits ≥ 2 × billigstes Item seiner MK` (MK1 → ≥ 176)
  **UND nicht im Kampf** (kein Ziel in Feuer-Range, niemand beschießt ihn).
- Schwelle **mitten im Kampf** erreicht → **kein** Trip; erst bei Ruhe (alle aktiv
  auf ihn Schießenden besiegt) bricht er auf.
- **`shop_anfahrt`:** fährt zum nächsten Shop-Feld. **Nicht unterbrechbar** durch
  neu auftauchende Gegner — **außer** der Störer hat `hpFrac < 0.2` (kaum HP):
  dann kurz töten, Loot einsammeln, weiter zum Shop.
- **`shop_dwell`:** steht **2,5 s** auf dem Feld (Schutzzone, simuliert den
  Einkauf), führt `planPurchases` aus, danach zurück zu `kaempfen`/`streifen`.
- **Anfangs-Shopping (überarbeitet):** frisch gespawnt → **Sofort-Erstkauf** beim
  Erscheinen (`planPurchases`, kein `shop_anfahrt`/`dwell`) + 5 s Spawn-Invuln. Die
  `shop_anfahrt`/`shop_dwell`-Maschinerie greift nur für **spätere** Trips.

## Symmetrie Spieler ↔ Gegner

| | Spieler | Gegner |
|---|---|---|
| Startgeld | `mostExpensiveItemPrice(1)` | `mostExpensiveItemPrice(MK)` |
| Geld verdienen | Kill → `geld` | Kill → `credits` |
| XP / MK | `addXp` → `unlockedMk` | identisch, eigene `Progression` |
| Einkauf | manuell, Shop-GUI | Heuristik, Shop-Anfahrt + dwell |
| Consumables | per Hotkey | Einsatz-KI |
| MK-Gate beim Anlegen | ja | ja (kauft nur ≤ seiner MK) |

## Gesetzte Defaults (korrigierbar)

- `shop_dwell` = 2,5 s
- „kaum-HP"-Störer-Schwelle = `hpFrac < 0.2`
- max. 2 Käufe / Trip
- Trip-Auslöser = `credits ≥ 2 × billigstes MK-Item`
- Consumable-Zünd-Sperre = 4 s

## Module & Testbarkeit

- `shop/catalog.ts`: `mostExpensiveItemPrice(mk)`, `cheapestItemPrice(mk)`,
  `itemsForSlotMk(slot, mk)`.
- `enemy/enemyEconomy.ts` (neu): `planPurchases`, `shouldStartShopTrip`,
  `pickBoosterToUse` — alle rein + Vitest.
- `enemy/enemy.ts`: `Progression`-Feld, XP-Gewinn, `level`/`enemyLevelStats` raus.
- `main.ts`: State-Machine, Anfangs-Shopping, dwell, XP-Vergabe verdrahten.
- `enemy/enemyShopping.ts`: entfernt.

## Nicht in diesem Spec (YAGNI / später)

- Echtes Item-„Browsen"/Abwägen über die Heuristik hinaus.
- Spieler-Consumable-Balance (bereits gebaut).
- Nemesis/Verrat/benannte Jäger (eigener späterer Block).
