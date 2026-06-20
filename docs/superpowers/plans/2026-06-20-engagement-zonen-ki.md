# Engagement-Zonen-KI (erste Fassung) — Implementierungsplan

> Umsetzung von `docs/superpowers/specs/2026-06-20-engagement-zonen-ki-erste-fassung-design.md`. Inline ausführen (executing-plans), Commit je Task.

**Goal:** Gegner tun immer etwas (scouten/annähern/feuern/abstand/fliehen) statt in der toten Zone zu stehen; Reichweiten gekoppelt; Modus sichtbar.

**Architecture:** Pure `engagementStep(EngageInput) → EngageOutput` (deterministisch). `Enemy` bekommt `scoutDir/scoutCd/mode`. main.ts ersetzt den alten Utility-Bewegungs-Block (unter Shop-Fahrt + Loot-Jagd) durch den engagementStep-Aufruf + Scout-Timer. `enemyBars` zeigt den Modus.

**Tech Stack:** TypeScript, Vitest, Babylon. Bestehende Muster: pure Logik + Tests, `__dbg`, Browser-Beweis.

---

### Task E1: engagement.ts (pure) + Test (TDD)
**Files:** Create `src/ai/engagement.ts`, `src/ai/engagement.test.ts`.
- [ ] **Test** (`engagement.test.ts`): kein Ziel → `mode='scout'`, Bewegung entlang scoutDir, `fire=false`; Ziel `d>fireRange` → `annähern` zum Ziel, `fire=false`; Ziel in `[keepDist,fireRange]` → `feuern`, `move=0`, `fire=true`; Ziel `d<keepDist` → `abstand`, weg, `fire=true`; `hpFrac<fleeHp` → `fliehen`, weg, `fire = d≤fireRange`. faceX/Z = Ziel (Kampf) bzw. voraus (scout).
- [ ] **Implementieren:** Vertrag aus Spec §6; Prüf-Reihenfolge scout→fliehen→annähern→abstand→feuern. Bewegungsvektor normiert.
- [ ] Test grün, `tsc` clean, **commit** `E1: engagementStep`.

### Task E2: Enemy-Felder scoutDir/scoutCd/mode
**Files:** Modify `src/enemy/enemy.ts`.
- [ ] `Enemy` += `scoutDir: number; scoutCd: number; mode: string;`. In `createEnemyEntity` init `scoutDir: rng()*Math.PI*2, scoutCd: 0, mode: 'scout'`.
- [ ] `tsc` clean, **commit** `E2: Scout-/Modus-Felder`.

### Task E3: main.ts — Engagement-Block + Scout-Timer
**Files:** Modify `src/main.ts`.
- [ ] Import `engagementStep`. Den bisherigen Block (Beutewert-Jagd `cands`/`pickTarget` BLEIBT; aber `world`/`e.brain.update`/`mx,mz`-Bewegung/Turm/Feuer) ersetzen:
  - `const target = pickTarget(...)` bleibt.
  - Scout-Timer: `e.scoutCd -= simDt; if (e.scoutCd<=0){ e.scoutCd = 3 + aiRng.next()*3; e.scoutDir = aiRng.next()*Math.PI*2; }`.
  - `const out = engagementStep({ selfX:ex, selfZ:ez, target: target?{x:target.x,z:target.z,dist:Math.hypot(target.x-ex,target.z-ez)}:null, hpFrac:e.combatant.hp/e.combatant.maxHp, fireRange:shotRange, keepDist:ENEMY_KEEP_DIST, fleeHp:0.25, scoutDir:e.scoutDir });`
  - `e.mode = out.mode;`
  - Bewegung: `if(out.moveX||out.moveZ){ const step=ENEMY_SPEED*simDt; er.position.x+=out.moveX*step; er.position.z+=out.moveZ*step; er.rotation.y=Math.atan2(out.moveX,out.moveZ); }`
  - Turm: `e.view.turretNode.rotation.y = yawTo(ex,ez,out.faceX,out.faceZ) - er.rotation.y;` (yawTo importieren falls nötig — sonst Math.atan2(faceX-ex,faceZ-ez)).
  - Feuer: `e.fireCd -= simDt; if(out.fire && e.fireCd<=0){ enemyFire(ex,ez,out.faceX,out.faceZ,e.combatant.team,e.damage); e.fireCd=ENEMY_FIRE_COOLDOWN; }`
  - `e.combatant.x=er.position.x; e.combatant.z=er.position.z;` (bleibt).
  - Den alten Code (AiWorldView world, e.brain.update, die annähern/fliehen/Revier-mx/mz-Logik, das alte Turm+Feuer) entfernen.
- [ ] `__dbg`: roster() um `mode: e.mode` ergänzen.
- [ ] `tsc` + Volltest grün, **commit** `E3: Engagement-Block + Scout`.

### Task E4: Modus-Overlay in enemyBars + Browser-Beweis
**Files:** Modify `src/ui/enemyBars.ts`, `src/main.ts`.
- [ ] `EnemyBarInfo` += `mode?: string`; Label zeigt `name` + kleine Modus-Zeile darunter.
- [ ] main: enemyBars.update-Mapping um `mode: e.mode`.
- [ ] **Browser:** bei 55–130 gespawnter Gegner ohne Ziel → `__dbg.roster()` zeigt `mode:'scout'` + Position ändert sich (fährt); Spieler in Sicht → wechselt auf `annähern`/`feuern`; Overlay zeigt Modus. Screenshot. Keine Konsolenfehler.
- [ ] **commit** `E4: Modus-Overlay + Beweis`.

---

## Selbst-Review
Spec-Abdeckung: Zonen-Modell→E1; Range-Kopplung→E1/E3 (kein ENGAGE_RANGE mehr, nur fireRange); Scouten→E1+E3-Timer; Prioritäten (Shop>Loot>Engagement)→E3 ersetzt nur den letzten Block; Overlay→E4; Tests→E1+E4. Typen: `EngageMode/EngageInput/EngageOutput` konsistent E1↔E3.
