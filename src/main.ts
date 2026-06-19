import { Engine, Scene, HemisphericLight, Vector3, Color4, Matrix } from '@babylonjs/core';
import { yawTo, rayGroundY0 } from './input/aimMath';
import { createClock } from './core/clock';
import { createBus } from './core/events';
import { createLogger, logConfig } from './core/log';
import { createRng } from './core/rng';
import { registerBiome, getBiome } from './world/biomeRegistry';
import { createEndlessGround } from './world/ground';
import { createCameraRig } from './camera/cameraRig';
import { createTankView } from './tank/tankFactory';
import { createTank } from './tank/tank';
import { createInput } from './input/input';
import { createProjectilePool } from './combat/projectilePool';
import { createProjectileView } from './combat/projectileView';
import { createCombatSystem, type Combatant } from './combat/combat';
import { createEnemyBrain } from './ai/enemyBrain';
import type { AiWorldView } from './ai/aiTypes';
import { enemyLevelStats, type Enemy } from './enemy/enemy';
import { createSpawner } from './enemy/spawner';
import { pickTarget, type TargetInfo } from './enemy/targeting';
import { createAkteBuch } from './named/akte';
import { generateNamed, istKnapperSieg } from './named/promotion';
import { createReveal } from './reveal/reveal';
import { createPlayerBar } from './ui/playerBar';
import { createMinimap } from './ui/minimap';
import { createEnemyBars } from './ui/enemyBars';
import { TANK_CLASSES, type TankClass } from './game/classes';
import { createPickupField } from './loot/pickups';
import { CATALOG, SLOT_SOCKET, type ShopItem } from './shop/catalog';
import { createShop } from './shop/shop';
import { evaluateBuy, sellValue } from './shop/buyLogic';
import { createLoadout } from './player/loadout';
import { createProgression } from './progression/progression';
import { startLoop } from './core/loop';
import { createAimDebug } from './debug/aimDebug';
import { createFireRecorder } from './debug/fireRecorder';
import { createReticle } from './ui/reticle';
import type { TankComposition } from './tank/sockets';

const BIOME_ID = 'steppe';
const PROJECTILE_CAPACITY = 64;
const PROJECTILE_SPEED = 30;
const PROJECTILE_LIFE = 3; // Sekunden
const SEED = 1337;
const TANK_RADIUS = 1.5; // Treffer-Radius eines Panzers (XZ)
const PROJECTILE_RADIUS = 0.3;
const HIT_DAMAGE = 20; // Schaden pro Treffer (100 HP -> 5 Treffer)
const ENEMY_SPEED = 5; // langsamer als der Spieler (8)
const ENEMY_SIGHT = 60; // Sichtweite auf das Ziel
const ENEMY_KEEP_DIST = 7; // beim Annähern nicht in den Spieler hineinlaufen
const ENEMY_FIRE_COOLDOWN = 1.4; // Sekunden zwischen Gegner-Schüssen
const LEBENSSCHUB = 40; // HP-Schub bei Promotion (statt Tod)

const log = createLogger('main');

function statBar(label: string, value: number, max: number, color: string): string {
  const pct = Math.round((value / max) * 100);
  return (
    `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font:600 11px/1.3 system-ui">` +
    `<span style="width:48px;color:#9aa">${label}</span>` +
    `<span style="flex:1;height:7px;background:#11151a;border-radius:4px;overflow:hidden">` +
    `<span style="display:block;height:100%;width:${pct}%;background:${color}"></span></span></div>`
  );
}

function mountStartScreen(onStart: (cls: TankClass) => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'start-screen';
  overlay.style.cssText =
    'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'gap:20px;background:#0b0d10;z-index:10;font-family:system-ui,sans-serif;';

  const title = document.createElement('div');
  title.textContent = 'Wähle deinen Panzer';
  title.style.cssText = 'color:#f0e6cc;font-size:24px;font-weight:700;letter-spacing:0.5px;';
  overlay.appendChild(title);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;justify-content:center;';
  overlay.appendChild(row);

  for (const cls of TANK_CLASSES) {
    const card = document.createElement('button');
    card.style.cssText =
      'width:230px;text-align:left;cursor:pointer;border:2px solid #2a343b;background:#13171c;' +
      'color:#e8e0c8;border-radius:10px;padding:16px;transition:border-color 0.12s,transform 0.12s;';
    card.onmouseenter = () => {
      card.style.borderColor = '#d8b04a';
      card.style.transform = 'translateY(-3px)';
    };
    card.onmouseleave = () => {
      card.style.borderColor = '#2a343b';
      card.style.transform = 'none';
    };
    card.innerHTML =
      `<div style="font-size:19px;font-weight:700;margin-bottom:4px">${cls.name}</div>` +
      `<div style="font:13px/1.4 system-ui;color:#b9b29c;min-height:54px;margin-bottom:8px">${cls.beschreibung}</div>` +
      statBar('Tempo', cls.speed, 12, '#4ea1ff') +
      statBar('Panzer', cls.maxHp, 160, '#5fd06a') +
      statBar('Schaden', cls.damage, 36, '#ff8a4e');
    card.addEventListener('click', () => {
      overlay.remove();
      onStart(cls);
    });
    row.appendChild(card);
  }

  document.body.appendChild(overlay);
}

function getCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
    document.body.appendChild(canvas);
  }
  return canvas;
}

function boot(cls: TankClass): void {
  log.info('boot start', { seed: SEED, biome: BIOME_ID, klasse: cls.id });

  const canvas = getCanvas();
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.06, 0.07, 1);

  // Kerndienste
  const clock = createClock();
  const bus = createBus();
  const rng = createRng(SEED);

  // Licht
  const light = new HemisphericLight('sun', new Vector3(0.3, 1, 0.2), scene);
  light.intensity = 0.95;

  // Biom 'steppe' ist beim Modulladen registriert; defensiv sicherstellen.
  registerBiome({ id: BIOME_ID, groundColor: [0.36, 0.4, 0.24] });
  const biome = getBiome(BIOME_ID);
  log.debug('biome resolved', { id: biome.id, groundColor: biome.groundColor });

  // Panzer aus der gewählten Klasse komponieren
  const comp: TankComposition = cls.composition;
  const view = createTankView(scene, comp);
  const tank = createTank('player', view, cls.maxHp);
  log.info('tank built', { id: tank.id, hp: tank.hp, comp, klasse: cls.id });

  // Endlos-Boden folgt dem Panzer-Root
  const ground = createEndlessGround(scene, tank.view.root, BIOME_ID);

  // Kamera auf den Panzer-Root
  const camera = createCameraRig(scene, tank.view.root);

  // Reveal-Inszenierung (Slowmo + Highlight + Spruch) für Promotions.
  const reveal = createReveal(scene, camera, engine, clock);

  // Projektil-Pool (rein logisch) + sichtbare Mesh-Brücke
  const pool = createProjectilePool(PROJECTILE_CAPACITY);
  const projectileView = createProjectileView(scene, pool, PROJECTILE_CAPACITY);

  // Gegner werden NICHT mehr fest gesetzt, sondern dauerhaft nachgespawnt (P1).
  const aiRng = createRng(SEED + 7);
  const roster: Enemy[] = []; // lebende + frisch promotete Gegner (dynamisch)
  const spawner = createSpawner(scene, TANK_RADIUS, () => aiRng.next(), {
    maxAlive: 6,
    interval: 2.5,
    radiusMin: 40,
    radiusMax: 55,
    maxLevel: 3,
  });

  // Combatant des Spielers (Gegner-Combatants liefert der Roster dynamisch).
  const playerCombatant: Combatant = {
    id: 'player', team: 'player', x: 0, z: 0, radius: TANK_RADIUS, hp: tank.hp, maxHp: cls.maxHp,
    alive: true, lootValue: 1.0,
  };
  const liveCombatants = (): Combatant[] => [playerCombatant, ...roster.map((e) => e.combatant)];

  // Duell-Gedächtnis (vor dem Kampf-System: dessen Tod-Handler nutzt es).
  const akteBuch = createAkteBuch();

  // Loadout (P4): ein Item je Slot, Stats = Klassen-Basis + bestückte Slots.
  const loadout = createLoadout({ damage: cls.damage, maxHp: cls.maxHp, speed: cls.speed, armor: 0 });
  let geld = 0; // Spielgeld, verdient durch Kills
  let playerSpeed = cls.speed; // aus loadout.stats() abgeleitet (Räder)
  const progression = createProgression(); // Level/XP/MK (P2)

  const pickups = createPickupField(scene);
  const PICKUP_REACH = TANK_RADIUS + 0.8;

  const combat = createCombatSystem(pool, liveCombatants, {
    damage: HIT_DAMAGE,
    projectileRadius: PROJECTILE_RADIUS,
    onHit: (h) => log.debug('hit', { target: h.target.id, hp: h.target.hp, lethal: h.lethal }),
    onDeath: (t, killerTeam) => {
      if (t.id === 'player') {
        log.warn('player died', {});
        bus.emit('tank.died', { tankId: 'player' });
        return;
      }
      const e = roster.find((r) => r.id === t.id);
      if (!e) return;
      const byPlayer = killerTeam === 'player';

      // PROMOTION nur bei knappem SPIELER-Sieg (Lebensschub statt Tod).
      if (byPlayer) {
        const playerFrac = playerCombatant.hp / playerCombatant.maxHp;
        akteBuch.record(e.id, { ausgang: 'sieg', playerHpFrac: playerFrac });
        if (istKnapperSieg(playerFrac) && !e.named) {
          const named = generateNamed('knapper_sieg', () => aiRng.next());
          akteBuch.promote(e.id, named);
          e.named = named;
          e.traits = { ...e.traits, ...named.traitOverlay };
          e.brain = createEnemyBrain(e.traits, () => aiRng.next());
          e.combatant.alive = true;
          e.combatant.hp = LEBENSSCHUB;
          log.info('PROMOTION: der Rasende erwacht', { id: e.id, name: named.name });
          reveal.triggerReveal(named, e.view.root, akteBuch.get(e.id)!);
          return;
        }
      }

      // Normaler Tod: Beute droppen (kann jeder aufsammeln).
      bus.emit('tank.died', { tankId: e.id });
      const dropPool = CATALOG.filter((it) => it.mk <= progression.unlockedMk() + 1);
      const part = dropPool[Math.floor(aiRng.next() * dropPool.length)]!;
      pickups.spawn(part, e.combatant.x, e.combatant.z);
      const reward = Math.round((e.combatant.lootValue ?? 0.4) * 120);

      if (byPlayer) {
        // Spieler-Kill: Geld + XP.
        geld += reward;
        const up = progression.addXp(Math.round(18 + (e.combatant.lootValue ?? 0.4) * 60));
        if (up.gained > 0) {
          const mkNote = up.newMkUnlocks.length ? ` — MK${up.newMkUnlocks[up.newMkUnlocks.length - 1]} frei!` : '';
          showToast(`Level ${progression.level}${mkNote}`);
        }
        log.info('enemy died (Spieler)', { id: e.id, drop: part.id, reward });
      } else {
        // Gegner-killt-Gegner: der Sieger bekommt Credits (→ Aufrüstung), kein Spieler-Gewinn.
        const killer = roster.find((r) => r.id === killerTeam);
        if (killer) killer.credits += reward;
        log.debug('enemy killed enemy', { tot: e.id, sieger: killerTeam });
      }

      // Gegner aus der Welt entfernen (Nachschub rückt nach).
      e.view.root.dispose();
      const idx = roster.indexOf(e);
      if (idx >= 0) roster.splice(idx, 1);
    },
  });

  // Permanenter Schuss-Rekorder: friert pro Schuss alle Zahlen + Cursor ein.
  const recorder = createFireRecorder(scene, camera);
  let simTime = 0; // Sekunden seit Boot (Sim-Uhr), in der Loop akkumuliert
  let frame = 0;
  let shotSeq = 0;

  // Feuern: Richtung im KLICK-Augenblick frisch aus dem aktuellen Cursor ableiten —
  // NICHT die (um einen Frame veraltete) Turm-Ausrichtung lesen. Sonst zielt der
  // Schuss aufs Ziel vom letzten Frame (bewiesen: aimErr 7-40° beim Bewegen).
  function fire(): void {
    const root = tank.view.root;
    const turret = tank.view.turretNode;
    const origin = root.getAbsolutePosition();
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
    const g = rayGroundY0(
      ray.origin.x,
      ray.origin.y,
      ray.origin.z,
      ray.direction.x,
      ray.direction.y,
      ray.direction.z,
    );
    // Richtung vom Schuss-Ursprung zum Cursor-Bodenpunkt; Fallback: Turm-Vorwärts.
    let dx: number;
    let dz: number;
    if (g) {
      const tx = g.x - origin.x;
      const tz = g.z - origin.z;
      const tl = Math.hypot(tx, tz) || 1;
      dx = tx / tl;
      dz = tz / tl;
      turret.rotation.y = yawTo(origin.x, origin.z, g.x, g.z); // Optik sofort mitziehen
    } else {
      turret.computeWorldMatrix(true);
      const fwd = turret.getDirection(new Vector3(0, 0, 1));
      const len = Math.hypot(fwd.x, fwd.z) || 1;
      dx = fwd.x / len;
      dz = fwd.z / len;
    }
    const p = pool.acquire({
      x: origin.x,
      y: 0.5,
      z: origin.z,
      dx,
      dz,
      speed: PROJECTILE_SPEED,
      life: PROJECTILE_LIFE,
      team: 'player',
      damage: loadout.stats().damage,
    });
    if (p) {
      bus.emit('tank.fired', { tankId: tank.id });
      bus.emit('projectile.spawned', { id: p.id });
      // Schuss mit Zeitstempel + eingefrorenem Cursor protokollieren.
      recorder.recordShot({
        shotId: ++shotSeq,
        frame,
        simTime,
        tankX: root.position.x,
        tankZ: root.position.z,
        originX: origin.x,
        originZ: origin.z,
        dirX: dx,
        dirZ: dz,
        speed: PROJECTILE_SPEED,
        range: PROJECTILE_SPEED * PROJECTILE_LIFE,
      });
      log.debug('fired', { tankId: tank.id, projectile: p.id, dx, dz });
    } else {
      log.warn('pool full, shot dropped', { capacity: PROJECTILE_CAPACITY });
    }
  }

  // Gegner feuert auf sein Ziel — eigene Fraktion (team = Gegner-id) + Level-Schaden.
  function enemyFire(ox: number, oz: number, tx: number, tz: number, team: string, damage: number): void {
    const dx = tx - ox;
    const dz = tz - oz;
    const l = Math.hypot(dx, dz) || 1;
    const p = pool.acquire({
      x: ox, y: 0.5, z: oz, dx: dx / l, dz: dz / l,
      speed: PROJECTILE_SPEED, life: PROJECTILE_LIFE, team, damage,
    });
    if (p) bus.emit('projectile.spawned', { id: p.id });
  }

  const input = createInput(scene, camera, tank, () => playerSpeed, fire);

  // OS-Mauszeiger über dem Canvas ausblenden — das Spiel zeichnet sein eigenes
  // Fadenkreuz, das frame-synchron mit dem Turm läuft (kein Render-Weg-Versatz).
  canvas.style.cursor = 'none';
  const reticle = createReticle(scene);

  // HUD (Spieler/Gegner-HP) + Minimap (Named = roter Punkt = Wiedererkennung auf der Karte).
  const playerBar = createPlayerBar(scene, camera, engine); // HP+EP über dem eigenen Panzer
  const minimap = createMinimap();
  const enemyBars = createEnemyBars(scene, camera, engine); // HP-Balken über den Gegnern

  // Loot-Toast: kurze Einblendung beim Aufsammeln eines Teils.
  const toast = document.createElement('div');
  toast.id = 'loot-toast';
  toast.style.cssText =
    'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:22;pointer-events:none;' +
    'font:700 16px system-ui,sans-serif;color:#ffe08a;background:rgba(8,10,12,0.72);' +
    'padding:8px 16px;border-radius:8px;opacity:0;transition:opacity 0.2s;text-shadow:0 1px 3px #000;';
  document.body.appendChild(toast);
  function showToast(msg: string): void {
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => (toast.style.opacity = '0'), 1600);
  }

  // Stats nach Loadout-Änderung neu ableiten; HP folgt der maxHP-Änderung.
  function applyStats(prevMaxHp: number): void {
    const st = loadout.stats();
    playerSpeed = st.speed;
    playerCombatant.maxHp = st.maxHp;
    playerCombatant.armor = st.armor;
    playerCombatant.hp = Math.min(st.maxHp, Math.max(1, playerCombatant.hp + (st.maxHp - prevMaxHp)));
  }

  // Teil anlegen (P3/P4): Slot-Item setzen, Variante sichtbar tauschen, Stats neu.
  function equip(item: ShopItem): void {
    const prevMax = loadout.stats().maxHp;
    loadout.equip(item);
    const map = SLOT_SOCKET[item.slot];
    if (map) tank.view.setVariant(map.socket, map.variant);
    applyStats(prevMax);
    playerCombatant.lootValue = 1 + loadout.all().length * 0.2; // mehr Teile = saftiger
    showToast('Angebaut: ' + item.name);
    const st = loadout.stats();
    log.info('equip', { item: item.id, dmg: st.damage, hp: st.maxHp, armor: st.armor, speed: +st.speed.toFixed(1) });
  }

  function sellItem(item: ShopItem): void {
    const prevMax = loadout.stats().maxHp;
    loadout.unequip(item.slot);
    const map = SLOT_SOCKET[item.slot];
    if (map) tank.view.setVariant(map.socket, cls.composition[map.socket]); // zurück zur Klassen-Optik
    applyStats(prevMax);
    geld += sellValue(item);
    showToast('Verkauft: ' + item.name);
  }

  // Shop (P3): MK-Werkstatt auf den Katalog (Taste B pausiert die Sim).
  const shop = createShop({
    items: CATALOG,
    getMoney: () => geld,
    getUnlockedMk: () => progression.unlockedMk(),
    isEquipped: (id) => loadout.owns(id),
    getEquipped: () => loadout.all(),
    onBuy: (item) => {
      const r = evaluateBuy(geld, item, progression.unlockedMk(), (id) => loadout.owns(id));
      if (r.ok) {
        geld -= item.cost;
        equip(item);
        showToast('Gekauft: ' + item.name);
      }
    },
    onSell: (item) => sellItem(item),
    onToggle: (o) => {
      clock.simSpeed = o ? 0 : 1; // Werkstatt friert die Welt ein
    },
  });

  // Mess-Overlay (Phase 1 Debugging): macht Cursor-Bodenpunkt, Ziel und Schussrichtung sichtbar.
  const aimDebug = createAimDebug(scene, camera, tank, () => input.getAimTarget());

  // Debug-Hooks für deterministische Verifikation (Promotion etc.).
  (window as unknown as { __dbg: unknown }).__dbg = {
    player: playerCombatant,
    enemies: roster.map((e) => e.combatant),
    roster: () =>
      roster.map((e) => ({
        id: e.id, motive: e.motiveId, action: e.action, level: e.level,
        credits: e.credits, hp: e.combatant.hp, alive: e.combatant.alive,
        loot: e.combatant.lootValue, team: e.combatant.team,
        x: +e.combatant.x.toFixed(1), z: +e.combatant.z.toFixed(1),
        named: e.named?.name ?? null,
      })),
    akte: () => akteBuch.all(),
    stats: () => loadout.stats(),
    loadout: () => loadout.all().map((it) => it.id),
    pickupCount: () => pickups.count(),
    equip,
    geld: () => geld,
    shop,
    progression: () => ({
      level: progression.level, xp: progression.xp,
      xpToNext: progression.xpToNext(), mk: progression.unlockedMk(),
    }),
    addXp: (n: number) => progression.addXp(n),
  };

  // §21.5-Sichtbarkeitszähler periodisch loggen (aktiv == sichtbar)

  // GENAU EIN Loop. Reihenfolge: Steuerung -> Pool-Logik -> Boden-Recenter -> Mesh-Sync.
  startLoop(engine, scene, clock, (simDt) => {
    simTime += simDt;
    input.update(simDt);
    reticle.update(input.getAimTarget()); // gleicher Frame wie der Turm
    pool.update(simDt);

    const px = tank.view.root.position.x;
    const pz = tank.view.root.position.z;

    // Permanenter Nachschub (P1): VOR dem KI-/Promotion-Teil.
    const aliveCount = roster.reduce((n, e) => n + (e.combatant.alive ? 1 : 0), 0);
    const spawned = spawner.update(simDt, px, pz, aliveCount);
    if (spawned) roster.push(spawned);

    // Gegner-KI (M2): jeder Gegner jagt den lohnendsten Ziel-Panzer (Beutewert).
    const allC = liveCombatants();
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const er = e.view.root;
      const ex = er.position.x;
      const ez = er.position.z;

      // Beutewert-Jagd: Ziel unter allen anderen Combatants wählen.
      const cands: TargetInfo[] = [];
      for (const c of allC) {
        if (c.id === e.id) continue;
        cands.push({ id: c.id, team: c.team, x: c.x, z: c.z, lootValue: c.lootValue ?? 0, alive: c.alive });
      }
      const target = pickTarget(ex, ez, e.combatant.team, ENEMY_SIGHT, cands);
      const tvis = target !== null;
      const tx = target ? target.x : ex;
      const tz = target ? target.z : ez;
      const dTarget = Math.hypot(tx - ex, tz - ez) || 1;
      const dHome = Math.hypot(e.home.x - ex, e.home.z - ez) || 0;

      const world: AiWorldView = {
        selfHpFrac: e.combatant.hp / e.combatant.maxHp,
        targetVisible: tvis,
        distance: dTarget,
        homeDistance: dHome,
        groupSize: 0,
        lootValue: target ? target.lootValue : 0,
      };
      e.action = e.brain.update(world, simDt);

      let mx = 0;
      let mz = 0;
      if (e.action === 'annähern' && tvis && dTarget > ENEMY_KEEP_DIST) {
        mx = (tx - ex) / dTarget;
        mz = (tz - ez) / dTarget;
      } else if (e.action === 'fliehen' && tvis) {
        mx = (ex - tx) / dTarget;
        mz = (ez - tz) / dTarget;
      } else if (e.action === 'Revier_halten' && dHome > 1) {
        mx = (e.home.x - ex) / dHome;
        mz = (e.home.z - ez) / dHome;
      }
      if (mx !== 0 || mz !== 0) {
        const step = ENEMY_SPEED * simDt;
        er.position.x += mx * step;
        er.position.z += mz * step;
        er.rotation.y = Math.atan2(mx, mz); // Chassis in Laufrichtung drehen
      }

      // Turm auf das Ziel richten (Rohr = Schussrichtung; Chassis-Drehung herausgerechnet).
      if (tvis) {
        const yaw = Math.atan2(tx - er.position.x, tz - er.position.z);
        e.view.turretNode.rotation.y = yaw - er.rotation.y;
      }

      // Auf Sicht feuern — eigene Fraktion + Level-Schaden (trifft Spieler UND Gegner).
      e.fireCd -= simDt;
      if (tvis && e.fireCd <= 0) {
        enemyFire(er.position.x, er.position.z, tx, tz, e.combatant.team, enemyLevelStats(e.level).damage);
        e.fireCd = ENEMY_FIRE_COOLDOWN;
      }

      // Gegner-Shop (E4): verdiente Credits autonom in ein Level investieren.
      e.shopCd -= simDt;
      if (e.shopCd <= 0) {
        e.shopCd = 5;
        const upgradeCost = 40 + e.level * 30;
        if (e.credits >= upgradeCost && e.level < 10) {
          e.credits -= upgradeCost;
          e.level += 1;
          const st = enemyLevelStats(e.level);
          e.combatant.maxHp = st.hp;
          e.combatant.hp = st.hp; // frisch aufgerüstet = repariert
          e.combatant.lootValue = st.lootValue; // wertvoller → wird selbst zum Ziel
        }
      }

      // Wiedererkennung: Spieler erneut in Sicht NACH Reveal → anderer Spruch, kein Reveal.
      if (e.named && tvis && target?.id === 'player' && !e.prevTargetVisible && !reveal.active()) {
        reveal.triggerRecognition(e.named, er, akteBuch.get(e.id)!);
      }
      e.prevTargetVisible = tvis;

      e.combatant.x = er.position.x;
      e.combatant.z = er.position.z;
    }

    // Spieler-Combatant spiegeln, dann Treffer auflösen.
    playerCombatant.x = px;
    playerCombatant.z = pz;
    combat.update();

    // Beute einsammeln: fährt der Spieler über ein Teil → anlegen.
    pickups.update(px, pz, PICKUP_REACH, equip);
    shop.refresh(); // Geld-Anzeige aktuell halten

    ground.update();
    projectileView.sync();
    aimDebug.update();
    reveal.update(engine.getDeltaTime() / 1000); // Echtzeit (HUD/Slowmo-Fade läuft real)

    // HUD zeigt den nächsten lebenden Gegner; Minimap zeigt ALLE.
    let hudEnemy: Enemy | null = null;
    let hudBest = Infinity;
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const d = Math.hypot(e.combatant.x - px, e.combatant.z - pz);
      if (d < hudBest) {
        hudBest = d;
        hudEnemy = e;
      }
    }
    playerBar.update({
      x: px,
      z: pz,
      hpFrac: playerCombatant.hp / playerCombatant.maxHp,
      xpFrac: progression.xpToNext() > 0 ? progression.xp / progression.xpToNext() : 1,
      level: progression.level,
      mk: progression.unlockedMk(),
    });
    minimap.update(
      playerCombatant.x,
      playerCombatant.z,
      roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({ x: e.combatant.x, z: e.combatant.z, color: e.named ? '#ff3b30' : '#e8a23c' })),
    );
    // HP-Balken schweben über den Gegnern.
    enemyBars.update(
      roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({
          x: e.combatant.x,
          z: e.combatant.z,
          hpFrac: e.combatant.hp / e.combatant.maxHp,
          named: e.named?.name ?? null,
        })),
    );

    frame++;

    // Live-Sonde: pro Frame Cursor-Pixel + Turm-Winkel + Tank-Pos festhalten.
    // Damit lässt sich frame-genau prüfen, ob der Turm sich OHNE Cursor-Bewegung dreht.
    (window as unknown as { __live: unknown }).__live = {
      frame,
      simTime: +simTime.toFixed(3),
      pointerX: scene.pointerX,
      pointerY: scene.pointerY,
      turretYawDeg: +((tank.view.turretNode.rotation.y * 180) / Math.PI).toFixed(2),
      tankX: +tank.view.root.position.x.toFixed(3),
      tankZ: +tank.view.root.position.z.toFixed(3),
      playerHp: playerCombatant.hp,
      playerAlive: playerCombatant.alive,
      enemyCount: roster.filter((e) => e.combatant.alive).length,
      nearestEnemyId: hudEnemy?.id ?? null,
      enemyHp: hudEnemy ? hudEnemy.combatant.hp : 0,
      enemyAlive: hudEnemy !== null,
      enemyNamed: hudEnemy?.named?.name ?? null,
      enemyAction: hudEnemy?.action ?? 'none',
      enemyX: hudEnemy ? +hudEnemy.combatant.x.toFixed(2) : 0,
      enemyZ: hudEnemy ? +hudEnemy.combatant.z.toFixed(2) : 0,
      enemyScreen: (() => {
        if (!hudEnemy) return { x: 0, y: 0 };
        const s = Vector3.Project(
          hudEnemy.view.root.getAbsolutePosition(),
          Matrix.IdentityReadOnly,
          scene.getTransformMatrix(),
          camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );
        return { x: Math.round(s.x), y: Math.round(s.y) };
      })(),
    };

    if (frame % 60 === 0) {
      const active = pool.activeCount();
      const visible = projectileView.visibleCount();
      log.debug('pool state', { active, visible, match: active === visible });
    }
  });
  log.info('loop running');

  // RNG bleibt für spätere deterministische Effekte gebunden (Slice 1: nur Beleg).
  void rng;

  window.addEventListener('resize', () => engine.resize());
}

// Logging scharf schalten.
logConfig.enabled = true;
logConfig.minLevel = 'debug';

mountStartScreen((cls) => boot(cls));
