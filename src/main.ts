import { Engine, Scene, HemisphericLight, Vector3, Color4, Matrix, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import { nearestInRange, idsWithinRadius } from './combat/areaTargeting';
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
import { MOTIV_LABEL } from './ai/motives';
import { engagementStep } from './ai/engagement';
import { applyEnemyStats, type Enemy } from './enemy/enemy';
import { rollEnemyEquipment, pickDrop, enemyMk } from './enemy/equipment';
import { planPurchases, shouldStartShopTrip, pickBoosterToUse } from './enemy/enemyEconomy';
import { stepAutoTurret, type AutoTurretState } from './combat/autoTurret';
import { createSpawner } from './enemy/spawner';
import { pickTarget, type TargetInfo } from './enemy/targeting';
import { createAkteBuch } from './named/akte';
import { generateNamed, istKnapperSieg } from './named/promotion';
import { createReveal } from './reveal/reveal';
import { createPlayerBar } from './ui/playerBar';
import { createMinimap } from './ui/minimap';
import { createEnemyBars } from './ui/enemyBars';
import { createOwnInventory, type OwnInvItem } from './ui/ownInventory';
import { createLootLabels } from './ui/lootLabels';
import { createOverviewMap, type MapBlip } from './ui/overviewMap';
import { createInspectCard } from './ui/inspectCard';
import { buildEnemyInfo } from './inspect/enemyInfo';
import { nearestToPointer, type ScreenBlip } from './inspect/enemyPick';
import { createBuffStack } from './combat/buffs';
import { createBelt } from './player/belt';
import { createBuffHud } from './ui/buffHud';
import { BOOSTERS, type BoosterDef } from './shop/boosters';
import { createActionLog } from './debug/actionLog';
import { createCameraPanel } from './ui/cameraPanel';
import { TANK_CLASSES, type TankClass } from './game/classes';
import { createPickupField } from './loot/pickups';
import { createShopField, TILE_RADIUS } from './world/shopTiles';
import { CATALOG, SLOT_SOCKET, catalogItem, cloneItem, mostExpensiveItemPrice, type ShopItem, type Slot } from './shop/catalog';
import { createShop } from './shop/shop';
import { sellValue } from './shop/buyLogic';

const SLOTS: Slot[] = ['waffe', 'wanne', 'turm', 'raeder', 'ruestung'];
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
const SEED = 1337;
const TANK_RADIUS = 1.5; // Treffer-Radius eines Panzers (XZ)
const PROJECTILE_RADIUS = 0.3;
const HIT_DAMAGE = 20; // Schaden pro Treffer (100 HP -> 5 Treffer)
const ENEMY_SPEED = 5; // langsamer als der Spieler (8)
const ENEMY_SIGHT = 60; // Sichtweite auf das Ziel
const ENEMY_KEEP_DIST = 7; // beim Annähern nicht in den Spieler hineinlaufen
const ENEMY_FIRE_COOLDOWN = 1.4; // Sekunden zwischen Gegner-Schüssen
const SHOP_DWELL = 2.5; // Sekunden Einkaufs-Verweildauer am Shop-Feld (simuliert den Einkauf)
const ENEMY_INTERRUPT_HP = 0.2; // ein Störer unter dieser HP-Fraktion wird auf dem Shop-Trip noch erledigt
const BELT_USE_CD = 4; // Sperre zwischen zwei Booster-Zündungen eines Gegners
const LOOT_SIGHT_HUNTER = 34; // Schatzjäger jagen Beute aus großer Distanz
const LOOT_SIGHT_NEAR = 9; // andere Gegner sammeln Beute nur in der Nähe auf
const ENEMY_BAG_MAX = 6; // so viele Teile trägt ein Gegner, dann verkauft er erst
const NAMED_RESPAWN = 6; // Sekunden, bis ein gefallener benannter Rivale zurückkehrt
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

  // Live einstellbar (Regler im Panel): Schussweite + max. Gegner + Spawn-Intervall.
  let shotRange = 40; // Weltеinheiten, die ein Schuss fliegt (nicht über die ganze Map)
  let maxEnemies = 4; // gleichzeitig lebende Gegner
  let spawnInterval = 3.5; // Sekunden zwischen Spawns

  // Gegner werden NICHT mehr fest gesetzt, sondern dauerhaft nachgespawnt (P1).
  const aiRng = createRng(SEED + 7);
  const roster: Enemy[] = []; // lebende + frisch promotete Gegner (dynamisch)
  const spawner = createSpawner(scene, TANK_RADIUS, () => aiRng.next(), {
    maxAlive: maxEnemies,
    interval: spawnInterval, // langsamer nachspawnen (per Regler änderbar)
    radiusMin: 55, // größere, weiter gestreute Spawn-Area (kein Dauerfeuer auf der Stelle)
    radiusMax: 130,
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
  let geld = mostExpensiveItemPrice(1); // Startbudget = teuerstes MK1-Item (symmetrisch zum Gegner)
  let playerSpeed = cls.speed; // aus loadout.stats() abgeleitet (Räder) × Buffs
  let playerTurretCd = 0; // Cooldown der Spieler-Sekundärwaffe (Auto-Turret)
  const progression = createProgression(); // Level/XP/MK (P2)

  // Run-Action-Log: pro Run nach logs/run-<NNN>.log (Schüsse, Bewegung, Shop …).
  const alog = createActionLog();
  alog.log('class', { id: cls.id });

  // SH2: Aktiv-Buffs + Sofort-Booster (Gürtel/Hotkeys 1-3) + Turm-Slew.
  const playerBuffs = createBuffStack();
  const belt = createBelt<BoosterDef>(3);
  const buffHud = createBuffHud();
  let overpressureShots = 0; // Überdruck-Munition: nächste N Schüsse stärker
  let overpressureMul = 1;
  let fireCd = 0; // Spieler-Feuer-Cooldown (Kühlmittel senkt ihn über fireRateMul)
  const PLAYER_FIRE_BASE = 0.28; // s zwischen Schüssen bei fireRate 1
  const BASE_TURRET_SLEW = 22; // rad/s Turm-Dreh-Tempo (Turmservo verdoppelt; Schüsse bleiben pixelgenau)
  let spawnGraceCd = 5; // 5s nach Erscheinen: unverwundbar + Shop überall öffenbar (Spawn & Respawn)
  const fxList: { mesh: Mesh; mat: StandardMaterial; life: number; max: number; fade: boolean; alpha0: number }[] = []; // kurzlebige Effekt-Meshes (Laser, Rauch)
  let ownInvRefreshCd = 0; // drosselt das Live-Refresh des Inventar-Panels

  const pickups = createPickupField(scene);
  const PICKUP_REACH = TANK_RADIUS + 0.8;
  const lastDrops: string[] = []; // Verifikation: tatsächlich gedroppte Item-IDs

  // Shop-Felder (S2): leuchtende Felder in der Welt. Shop nur dort, Welt läuft
  // weiter, auf dem Feld ist man unverwundbar.
  const shopField = createShopField(scene);

  const combat = createCombatSystem(pool, liveCombatants, {
    damage: HIT_DAMAGE,
    projectileRadius: PROJECTILE_RADIUS,
    onHit: (h) => log.debug('hit', { target: h.target.id, hp: h.target.hp, lethal: h.lethal }),
    onDeath: (t, killerTeam) => {
      if (t.id === 'player') {
        log.warn('player died', {});
        alog.log('player.death', {});
        bus.emit('tank.died', { tankId: 'player' });
        respawnPlayer();
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
          const named = generateNamed('knapper_sieg', MOTIV_LABEL[e.motiveId] ?? 'Aasgeier', () => aiRng.next());
          akteBuch.promote(e.id, named);
          e.named = named;
          e.displayName = named.name; // "Panzer N" → "Garfild der Aasgeier"
          alog.log('promotion', { id: e.id, name: named.name, motiv: e.motiveId });
          e.traits = { ...e.traits, ...named.traitOverlay };
          e.brain = createEnemyBrain(e.traits, () => aiRng.next());
          e.combatant.alive = true;
          e.combatant.hp = LEBENSSCHUB;
          log.info('PROMOTION', { id: e.id, name: named.name });
          reveal.triggerReveal(named, e.view.root, akteBuch.get(e.id)!);
          return;
        }
      }

      // Normaler Tod: NUR ein tatsächlich angelegtes Teil droppen (kein generierter Loot).
      // Eingesammelte Beute in der Tasche fällt ebenfalls zurück in die Welt.
      bus.emit('tank.died', { tankId: e.id });
      const part = pickDrop(e.equipment, () => aiRng.next());
      if (part) {
        pickups.spawn(part, e.combatant.x, e.combatant.z);
        lastDrops.push(part.id);
        if (lastDrops.length > 200) lastDrops.shift();
      }
      for (const carried of e.bag) pickups.spawn(carried, e.combatant.x, e.combatant.z);
      e.bag = [];
      const reward = Math.round((e.combatant.lootValue ?? 0.4) * 120);

      if (byPlayer) {
        // Spieler-Kill: Geld + XP.
        geld += reward;
        const up = progression.addXp(Math.round(18 + (e.combatant.lootValue ?? 0.4) * 60));
        if (up.gained > 0) {
          const mkNote = up.newMkUnlocks.length ? ` — MK${up.newMkUnlocks[up.newMkUnlocks.length - 1]} frei!` : '';
          showToast(`Level ${progression.level}${mkNote}`);
        }
        log.info('enemy died (Spieler)', { id: e.id, drop: part?.id ?? null, reward });
      } else {
        // Gegner-killt-Gegner: der Sieger bekommt Credits UND XP (→ MK-Aufstieg wie der Spieler).
        const killer = roster.find((r) => r.id === killerTeam);
        if (killer) {
          killer.credits += reward;
          const up = killer.prog.addXp(Math.round(18 + (e.combatant.lootValue ?? 0.4) * 60));
          if (up.newMkUnlocks.length) applyEnemyStats(killer); // neue MK → frische Stats/HP
        }
        log.debug('enemy killed enemy', { tot: e.id, sieger: killerTeam });
      }

      if (e.named) {
        // Benannter Rivale: stirbt, KEHRT aber zurück (Nemesis) — bleibt im Roster.
        e.combatant.alive = false;
        e.view.root.setEnabled(false);
        e.respawnTimer = NAMED_RESPAWN;
        log.info('Rivale gefallen — kehrt zurück', { name: e.displayName });
      } else {
        // Normaler Gegner: endgültig weg, Nachschub rückt nach.
        e.view.root.dispose();
        const idx = roster.indexOf(e);
        if (idx >= 0) roster.splice(idx, 1);
      }
    },
  });

  // Permanenter Schuss-Rekorder: friert pro Schuss alle Zahlen + Cursor ein.
  const recorder = createFireRecorder(scene, camera);
  let simTime = 0; // Sekunden seit Boot (Sim-Uhr), in der Loop akkumuliert
  let frame = 0;
  let shotSeq = 0;
  let moveLogCd = 0; // Bewegung nur alle 0,5 s loggen (kein Frame-Spam)

  // Feuern: Richtung im KLICK-Augenblick frisch aus dem aktuellen Cursor ableiten —
  // NICHT die (um einen Frame veraltete) Turm-Ausrichtung lesen. Sonst zielt der
  // Schuss aufs Ziel vom letzten Frame (bewiesen: aimErr 7-40° beim Bewegen).
  function fire(): void {
    if (fireCd > 0) return; // Feuer-Cooldown (Kühlmittel senkt ihn)
    fireCd = PLAYER_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
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
      turret.rotation.y = yawTo(origin.x, origin.z, g.x, g.z) - root.rotation.y; // Optik, Chassis kompensiert
    } else {
      turret.computeWorldMatrix(true);
      const fwd = turret.getDirection(new Vector3(0, 0, 1));
      const len = Math.hypot(fwd.x, fwd.z) || 1;
      dx = fwd.x / len;
      dz = fwd.z / len;
    }
    let shotDamage = loadout.stats().damage;
    if (overpressureShots > 0) {
      shotDamage = Math.round(shotDamage * overpressureMul);
      overpressureShots -= 1;
    }
    const p = pool.acquire({
      x: origin.x,
      y: 0.5,
      z: origin.z,
      dx,
      dz,
      speed: PROJECTILE_SPEED,
      life: shotRange / PROJECTILE_SPEED, // begrenzte Schussweite
      team: 'player',
      damage: shotDamage,
    });
    if (p) {
      bus.emit('tank.fired', { tankId: tank.id });
      bus.emit('projectile.spawned', { id: p.id });
      alog.log('shot', { x: +origin.x.toFixed(1), z: +origin.z.toFixed(1), dmg: shotDamage });
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
        range: shotRange,
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
      speed: PROJECTILE_SPEED, life: shotRange / PROJECTILE_SPEED, team, damage,
    });
    if (p) bus.emit('projectile.spawned', { id: p.id });
  }

  /** Kurzer roter Markierungs-Laser vom Spieler zum Ziel (verschwindet schnell). */
  function spawnLaser(ax: number, az: number, bx: number, bz: number): void {
    const line = MeshBuilder.CreateLines(
      'fx_laser',
      { points: [new Vector3(ax, 1.1, az), new Vector3(bx, 1.6, bz)] },
      scene,
    );
    line.color = new Color3(1, 0.2, 0.2);
    line.isPickable = false;
    // CreateLines hat kein StandardMaterial — wir tracken nur die Lebensdauer (kein Fade).
    fxList.push({ mesh: line as unknown as Mesh, mat: null as unknown as StandardMaterial, life: 0.4, max: 0.4, fade: false, alpha0: 1 });
  }

  /** Verblassende Rauch-Scheibe am Boden (Radius = Wirkbereich). */
  function spawnSmokeDisc(x: number, z: number, radius: number, duration: number): void {
    const disc = MeshBuilder.CreateCylinder('fx_smoke', { diameter: radius * 2, height: 0.4, tessellation: 40 }, scene);
    disc.position.set(x, 0.25, z); // flache Scheibe am Boden (bewährtes Shop-Feld-Muster)
    disc.isPickable = false;
    const mat = new StandardMaterial('fx_smoke_mat', scene);
    mat.emissiveColor = new Color3(0.82, 0.85, 0.9); // hell, klar gegen den dunklen Boden
    mat.disableLighting = true;
    const alpha0 = 0.6;
    mat.alpha = alpha0;
    disc.material = mat;
    fxList.push({ mesh: disc, mat, life: duration, max: duration, fade: true, alpha0 });
  }

  /** Effekt-Meshes altern lassen (Fade) und am Ende entsorgen. */
  function updateFx(dt: number): void {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const fx = fxList[i]!;
      fx.life -= dt;
      if (fx.fade && fx.mat) fx.mat.alpha = fx.alpha0 * Math.max(0, fx.life / fx.max);
      if (fx.life <= 0) {
        fx.mesh.dispose();
        fxList.splice(i, 1);
      }
    }
  }

  /** Auto-Turret-Schuss (Sekundärwaffe). Richtung ist bereits gemäß Treffsicherheit gestreut (rad). */
  function fireAutoTurret(ox: number, oz: number, dir: number, team: string, damage: number, range: number): void {
    const p = pool.acquire({
      x: ox, y: 0.5, z: oz, dx: Math.sin(dir), dz: Math.cos(dir),
      speed: PROJECTILE_SPEED, life: range / PROJECTILE_SPEED, team, damage,
    });
    if (p) bus.emit('projectile.spawned', { id: p.id });
  }

  const input = createInput(
    scene, camera, tank, () => playerSpeed, fire,
    () => BASE_TURRET_SLEW * playerBuffs.aggregate().turretSlewMul,
  );

  // OS-Mauszeiger über dem Canvas ausblenden — das Spiel zeichnet sein eigenes
  // Fadenkreuz, das frame-synchron mit dem Turm läuft (kein Render-Weg-Versatz).
  canvas.style.cursor = 'none';
  const reticle = createReticle(scene);

  // HUD (Spieler/Gegner-HP) + Minimap (Named = roter Punkt = Wiedererkennung auf der Karte).
  const playerBar = createPlayerBar(scene, camera, engine); // HP+EP über dem eigenen Panzer
  const minimap = createMinimap();
  const enemyBars = createEnemyBars(scene, camera, engine); // HP-Balken über den Gegnern
  const lootLabels = createLootLabels(scene, camera, engine); // Item-Namen über den Loot-Würfeln
  // Live-Tuning-Regler (Schussweite, Max-Gegner, Spawn-Intervall) — vom Panel gelesen.
  (window as unknown as { __tune: unknown }).__tune = {
    getShotRange: () => shotRange,
    setShotRange: (v: number) => {
      shotRange = Math.max(8, v);
    },
    getMaxEnemies: () => maxEnemies,
    setMaxEnemies: (v: number) => {
      maxEnemies = Math.max(0, Math.round(v));
      spawner.setMaxAlive(maxEnemies);
    },
    getSpawnInterval: () => spawnInterval,
    setSpawnInterval: (v: number) => {
      spawnInterval = Math.max(0.2, v);
      spawner.setInterval(spawnInterval);
    },
  };
  // Jede Regler-Änderung in den Run-Log schreiben (kein manuelles Durchgeben nötig).
  createCameraPanel((name, value) => alog.log('regler', { name, value }));

  // Inspizier-System (P0): M = Echtzeit-Übersichtskarte, I = modaler Tiefblick (Pause).
  const overviewMap = createOverviewMap();
  const inspectCard = createInspectCard();
  let prevSimSpeed = 1; // gespeicherter Zeitfaktor während Inspizieren (Pausen-Vertrag)
  let inspecting = false;
  let hoveredId: string | null = null;
  // Overlay-fester Maus-Tracker (DOM-Overlays schlucken scene.pointerX sonst).
  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  // "[I] Inspizieren"-Hinweis am anvisierten Gegner (lehrt die Taste).
  const inspectPrompt = document.createElement('div');
  inspectPrompt.style.cssText =
    'position:fixed;z-index:18;transform:translate(-50%,-100%);pointer-events:none;display:none;' +
    'font:700 11px system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;white-space:nowrap;';
  inspectPrompt.textContent = '[I] Inspizieren';
  document.body.appendChild(inspectPrompt);

  function openInspect(id: string): void {
    const e = roster.find((r) => r.id === id && r.combatant.alive);
    if (!e) return;
    const info = buildEnemyInfo({ ...e, speed: ENEMY_SPEED, level: e.prog.level, activeBuffs: e.buffs.active().map((b) => b.label ?? b.id) }, akteBuch.get(e.id) ?? null);
    prevSimSpeed = clock.simSpeed;
    clock.simSpeed = 0; // Welt pausiert; beim Schließen wird prevSimSpeed wiederhergestellt
    inspecting = true;
    inspectCard.open(info, () => {
      clock.simSpeed = prevSimSpeed;
      inspecting = false;
    });
  }

  // Gürtel-HUD: 3 Ladungs-Slots (Tasten 1-3) unten mittig.
  const beltHud = document.createElement('div');
  beltHud.style.cssText =
    'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:19;display:flex;gap:8px;pointer-events:none;';
  document.body.appendChild(beltHud);
  const beltSlotEls: HTMLElement[] = [];
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div');
    s.style.cssText =
      'min-width:78px;text-align:center;background:rgba(8,12,16,0.78);border:1px solid #2a343b;' +
      'border-radius:7px;padding:5px 8px;font:600 10px system-ui,sans-serif;';
    beltHud.appendChild(s);
    beltSlotEls.push(s);
  }
  function updateBeltHud(): void {
    const slots = belt.slots();
    for (let i = 0; i < 3; i++) {
      const it = slots[i];
      beltSlotEls[i]!.innerHTML =
        `<div style="color:#ffe08a;font-weight:800">[${i + 1}]</div>` +
        (it ? `<div style="color:#cdd6dd">${it.name}</div>` : `<div style="color:#566">leer</div>`);
    }
  }
  updateBeltHud();

  function applyBooster(def: BoosterDef): void {
    const eff = def.effect;
    if (eff.kind === 'buff') {
      if (eff.onlyLowHp && playerCombatant.hp / playerCombatant.maxHp >= 0.2) {
        belt.add(def); // Bedingung nicht erfüllt → nicht verschwenden, zurück in den Gürtel
        showToast('Nur unter 20 % HP: ' + def.name);
        return;
      }
      playerBuffs.add({ ...eff.buff, label: def.name });
    } else if (eff.kind === 'tempHp') {
      playerCombatant.hp = Math.min(playerCombatant.maxHp, playerCombatant.hp + eff.amount);
    } else if (eff.kind === 'nextShots') {
      overpressureShots = eff.shots;
      overpressureMul = eff.damageMul;
    } else if (eff.kind === 'paint') {
      // Zielmarkierung: den anvisierten (Cursor-nächsten) Gegner verwundbar machen.
      const aim = input.getAimTarget();
      const ax = aim ? aim.x : playerCombatant.x;
      const az = aim ? aim.z : playerCombatant.z;
      const cands = roster.filter((e) => e.combatant.alive)
        .map((e) => ({ id: e.id, x: e.combatant.x, z: e.combatant.z }));
      const hit = nearestInRange(ax, az, cands, eff.range);
      if (!hit) {
        belt.add(def); // kein Ziel in Reichweite → Ladung nicht verschwenden
        showToast('Kein Ziel in Reichweite für ' + def.name);
        return;
      }
      const tgt = roster.find((r) => r.id === hit.id)!;
      tgt.buffs.add({ id: 'markiert', duration: eff.duration, incomingMul: eff.incomingMul, label: 'Markiert' });
      spawnLaser(playerCombatant.x, playerCombatant.z, tgt.combatant.x, tgt.combatant.z);
      alog.log('debuff', { id: def.id, ziel: tgt.id });
      showToast(`Markiert: ${tgt.displayName} (+${Math.round((eff.incomingMul - 1) * 100)} % Schaden)`);
      return;
    } else if (eff.kind === 'smoke') {
      // Rauch: nahe Gegner-Geschütze treffen schlechter (accuracyAdd negativ).
      const cands = roster.filter((e) => e.combatant.alive)
        .map((e) => ({ id: e.id, x: e.combatant.x, z: e.combatant.z }));
      const ids = idsWithinRadius(playerCombatant.x, playerCombatant.z, cands, eff.radius);
      for (const id of ids) {
        const e = roster.find((r) => r.id === id);
        if (e) e.buffs.add({ id: 'vernebelt', duration: eff.duration, accuracyAdd: -eff.accuracyPenalty, label: 'Vernebelt' });
      }
      spawnSmokeDisc(playerCombatant.x, playerCombatant.z, eff.radius, eff.duration);
      alog.log('debuff', { id: def.id, getroffen: ids.length });
      showToast(`Rauch ausgebracht — ${ids.length} Gegner vernebelt`);
      return;
    }
    alog.log('booster', { id: def.id });
    showToast('Gezündet: ' + def.name);
  }
  function triggerBelt(i: number): void {
    if (inspecting || shop.isOpen()) return;
    const def = belt.trigger(i);
    if (!def) return;
    applyBooster(def);
    updateBeltHud();
  }

  /** Booster-Effekt auf einen Gegner anwenden (symmetrisch zu applyBooster). */
  function applyEnemyBooster(e: Enemy, def: BoosterDef): void {
    const eff = def.effect;
    if (eff.kind === 'buff') {
      if (eff.onlyLowHp && e.combatant.hp / e.combatant.maxHp >= 0.2) { e.belt.add(def); return; }
      e.buffs.add({ ...eff.buff, label: def.name });
    } else if (eff.kind === 'tempHp') {
      e.combatant.hp = Math.min(e.combatant.maxHp, e.combatant.hp + eff.amount);
    } else if (eff.kind === 'nextShots') {
      e.overShots = eff.shots;
      e.overMul = eff.damageMul;
    }
    alog.log('enemy.booster', { id: e.id, booster: def.id });
  }

  // Eigenes Live-Inventar (Taste „I" ohne anvisierten Gegner) — OHNE Pause.
  const INV_SLOTS: { slot: Slot; label: string }[] = [
    { slot: 'waffe', label: 'Waffe' },
    { slot: 'sekundaer', label: 'Sekundär' },
    { slot: 'turm', label: 'Turm' },
    { slot: 'wanne', label: 'Wanne' },
    { slot: 'raeder', label: 'Räder' },
    { slot: 'ruestung', label: 'Rüstung' },
  ];
  function invStat(it: ShopItem): string {
    if (it.autoFire) return `Auto: ${it.autoFire.damage} Schaden`;
    if (it.damage) return `${it.damage} Schaden`;
    if (it.hp) return `${it.hp} HP`;
    if (it.armor) return `${it.armor} Rüstung`;
    if (it.speed) return `${it.speed} Tempo`;
    if (it.dodge) return `${Math.round(it.dodge * 100)} % Ausweichen`;
    return '—';
  }
  function invItem(it: ShopItem): OwnInvItem {
    return { id: it.id, name: it.name, stat: invStat(it), rarity: it.rarity };
  }
  const ownInv = createOwnInventory({
    slots: () =>
      INV_SLOTS.map((s) => {
        const it = loadout.get(s.slot);
        return { slot: s.slot, label: s.label, item: it ? invItem(it) : null };
      }),
    bag: () => loadout.bag().map(invItem),
    stats: () => {
      const st = loadout.stats();
      return { damage: st.damage, maxHp: st.maxHp, armor: st.armor, speed: st.speed, dodge: st.dodge };
    },
    onEquip: (id) => {
      const it = loadout.bag().find((x) => x.id === id);
      if (it) { loadout.equip(it); alog.log('inv.equip', { id }); }
    },
    onUnequip: (slot) => { loadout.unequip(slot as Slot); alog.log('inv.unequip', { slot }); },
  });

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (k === 'm' && !inspecting) {
      overviewMap.toggle();
    } else if (k === 'i') {
      if (inspecting) inspectCard.close();
      else if (ownInv.isOpen()) ownInv.toggle(); // offenes Inventar schließen
      else if (hoveredId && !shop.isOpen()) openInspect(hoveredId); // Gegner anvisiert → Inspect (pausiert)
      else if (!shop.isOpen()) ownInv.toggle(); // kein Gegner → eigenes Inventar (läuft weiter)
    } else if (ev.key === 'Escape' && inspecting) {
      inspectCard.close();
    } else if (k === '1' || k === '2' || k === '3') {
      triggerBelt(Number(k) - 1);
    }
  });

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

  // Spieler-Respawn: bei 0 HP nicht „tot weiterballern", sondern neu aufbauen —
  // volle HP, an eine neue zufällige Position, mit kurzer Mercy-Unverwundbarkeit.
  function respawnPlayer(): void {
    const ang = aiRng.next() * Math.PI * 2;
    const r = 50 + aiRng.next() * 30;
    tank.view.root.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    playerCombatant.x = tank.view.root.position.x;
    playerCombatant.z = tank.view.root.position.z;
    playerCombatant.hp = playerCombatant.maxHp;
    playerCombatant.alive = true;
    playerCombatant.invulnerable = true; // sofort (schützt auch im selben combat-Frame)
    spawnGraceCd = 5; // Respawn = Erscheinen: 5s Invuln + Shop überall öffenbar
    alog.log('player.respawn', { x: +playerCombatant.x.toFixed(1), z: +playerCombatant.z.toFixed(1) });
    showToast('Zerstört — neu aufgebaut');
  }

  // Optik + Stats nach JEDER Loadout-Änderung synchron halten (Slots ↔ Tasche).
  function syncTank(prevMaxHp: number): void {
    for (const slot of SLOTS) {
      const map = SLOT_SOCKET[slot];
      if (!map) continue;
      const it = loadout.get(slot);
      tank.view.setVariant(map.socket, it ? map.variant : cls.composition[map.socket]);
    }
    const st = loadout.stats();
    playerSpeed = st.speed;
    playerCombatant.maxHp = st.maxHp;
    playerCombatant.armor = st.armor;
    playerCombatant.hp = Math.min(st.maxHp, Math.max(1, playerCombatant.hp + (st.maxHp - prevMaxHp)));
    playerCombatant.lootValue = 1 + (loadout.equippedList().length + loadout.bag().length) * 0.15;
  }

  // Anlegen (aus Tasche/Kauf): neues Item in den Slot, altes → Tasche.
  function equip(item: ShopItem): void {
    // MK-Gate: über der freigeschalteten MK kann der Spieler ein Teil NICHT anlegen
    // (looten ja, in die Tasche — aber nutzbar erst, wenn die MK frei ist).
    if (item.mk > progression.unlockedMk()) {
      showToast(`MK ${item.mk} nötig — du hast MK ${progression.unlockedMk()}`);
      alog.log('equip.denied', { id: item.id, mk: item.mk, unlocked: progression.unlockedMk() });
      return;
    }
    const prevMax = loadout.stats().maxHp;
    loadout.equip(item);
    syncTank(prevMax);
    alog.log('equip', { id: item.id, slot: item.slot });
    showToast('Angelegt: ' + item.name);
  }
  function unequipSlot(slot: Slot): void {
    const prevMax = loadout.stats().maxHp;
    loadout.unequip(slot);
    syncTank(prevMax);
    alog.log('unequip', { slot });
    showToast('Abgelegt → Inventar');
  }
  function sellAny(item: ShopItem): void {
    const prevMax = loadout.stats().maxHp;
    loadout.remove(item);
    geld += sellValue(item);
    syncTank(prevMax);
    alog.log('shop.sell', { id: item.id, slot: item.slot, geld });
    showToast(`Verkauft: ${item.name} (+💰 ${sellValue(item)})`);
  }
  // Loot landet im INVENTAR (Tasche), nicht automatisch im Slot.
  function collectLoot(item: ShopItem): void {
    loadout.addToBag(cloneItem(item)); // eigene Instanz — keine geteilten Referenzen
    alog.log('loot', { id: item.id });
    showToast('Eingesammelt: ' + item.name + ' → Inventar');
  }

  // Werkstatt (Taste B pausiert die Sim): Ausrüstung · Inventar · Kaufen.
  const shop = createShop({
    items: CATALOG,
    getMoney: () => geld,
    getUnlockedMk: () => progression.unlockedMk(),
    getSlot: (slot) => loadout.get(slot),
    getBag: () => loadout.bag(),
    onBuy: (item) => {
      if (item.rarity !== 'normal' || item.mk > progression.unlockedMk() || geld < item.cost) return;
      geld -= item.cost;
      equip(cloneItem(item)); // eigene Instanz in den Slot, altes → Tasche
      alog.log('shop.buy', { id: item.id, cost: item.cost, geld });
      showToast('Gekauft & angelegt: ' + item.name);
    },
    onEquip: (item) => equip(item),
    onUnequip: (slot) => unequipSlot(slot),
    onSell: (item) => sellAny(item),
    // SH2: Sofort-Booster — kaufbar (Spieler), landen als Ladung im Gürtel.
    getBoosters: () => BOOSTERS.filter((b) => b.buyer !== 'enemy'),
    getBelt: () => belt.slots(),
    onBuyBooster: (b) => {
      if (geld < b.cost) return;
      if (belt.slots().every((s) => s !== null)) {
        showToast('Gürtel voll (max 3)');
        return;
      }
      geld -= b.cost;
      belt.add(b);
      updateBeltHud();
      alog.log('shop.buyBooster', { id: b.id, cost: b.cost, geld });
      showToast('Gekauft → Gürtel: ' + b.name);
    },
    // Werkstatt: auf einem Shop-Feld ODER während der 5s-Gnadenzeit nach dem Erscheinen (überall).
    canOpen: () => shopField.isOnTile(playerCombatant.x, playerCombatant.z) || spawnGraceCd > 0,
    onToggle: (o) => alog.log(o ? 'shop.open' : 'shop.close', { geld }),
  });

  // Mess-Overlay (Phase 1 Debugging): macht Cursor-Bodenpunkt, Ziel und Schussrichtung sichtbar.
  const aimDebug = createAimDebug(scene, camera, tank, () => input.getAimTarget());

  // Debug-Hooks für deterministische Verifikation (Promotion etc.).
  (window as unknown as { __dbg: unknown }).__dbg = {
    player: playerCombatant,
    enemies: roster.map((e) => e.combatant),
    roster: () =>
      roster.map((e) => ({
        id: e.id, motive: e.motiveId, mode: e.mode, level: e.prog.level,
        credits: e.credits, hp: e.combatant.hp, alive: e.combatant.alive,
        loot: e.combatant.lootValue, team: e.combatant.team,
        x: +e.combatant.x.toFixed(1), z: +e.combatant.z.toFixed(1),
        named: e.named?.name ?? null,
      })),
    akte: () => akteBuch.all(),
    stats: () => loadout.stats(),
    loadout: () => loadout.equippedList().map((it) => it.id),
    bag: () => loadout.bag().map((it) => it.id),
    equippedBySlot: () => Object.fromEntries(SLOTS.map((s) => [s, loadout.get(s)?.id ?? null])),
    enemyEquip: (id: string) => roster.find((r) => r.id === id)?.equipment.map((i) => i.id) ?? null,
    enemyBag: (id: string) => roster.find((r) => r.id === id)?.bag.map((i) => i.id) ?? null,
    // Verifikations-Sonden (Observability): Gegner-Kampfwerte lesen + Gear setzen.
    enemyCombat: (id: string) => {
      const e = roster.find((r) => r.id === id);
      if (!e) return null;
      return {
        level: e.prog.level,
        hp: Math.round(e.combatant.hp),
        maxHp: Math.round(e.combatant.maxHp),
        armor: Math.round(e.combatant.armor ?? 0),
        dodge: e.combatant.dodge ?? 0,
        incomingMul: e.combatant.incomingMul ?? 1, // >1 = markiert/verwundbar
        damage: e.damage, // aus der Ausrüstung abgeleitet
        equipMk: e.equipment.map((i) => i.mk),
      };
    },
    setEnemyGear: (id: string, mk: number) => {
      const e = roster.find((r) => r.id === id);
      if (!e) return 'nicht gefunden';
      const mkStr = String(mk).padStart(2, '0');
      e.equipment = (['waffe', 'wanne', 'turm', 'raeder', 'ruestung'] as Slot[]).map((s) =>
        catalogItem(`${s}_mk${mkStr}_normal`),
      );
      applyEnemyStats(e); // Stats aus der Ausrüstung neu berechnen (nach dem Fix)
      const e2 = roster.find((r) => r.id === id)!;
      return {
        level: e2.prog.level, maxHp: Math.round(e2.combatant.maxHp),
        armor: Math.round(e2.combatant.armor ?? 0), equipMk: e2.equipment.map((i) => i.mk),
      };
    },
    // SH3.5: einem Gegner eine Sekundärwaffe (Auto-Turret) geben (manueller Test).
    giveEnemyAutoTurret: (id: string, turretId = 'autoturret_mk05') => {
      const e = roster.find((r) => r.id === id);
      if (!e) return 'nicht gefunden';
      e.equipment.push(cloneItem(catalogItem(turretId)));
      return { id: e.id, equip: e.equipment.map((i) => i.id) };
    },
    // SH3.5: Spieler ein Item in die Tasche legen UND anlegen (manueller Test, z. B. Auto-Turret).
    giveAndEquip: (id: string) => {
      const it = cloneItem(catalogItem(id));
      loadout.addToBag(it);
      loadout.equip(it);
      return { equipped: loadout.equippedList().map((i) => i.id), dodge: loadout.stats().dodge };
    },
    fxNow: () => fxList.map((f) => ({
      name: f.mesh.name, alpha: f.mat ? +f.mat.alpha.toFixed(2) : null,
      visible: f.mesh.isVisible, enabled: f.mesh.isEnabled(),
      x: +f.mesh.position.x.toFixed(1), z: +f.mesh.position.z.toFixed(1), life: +f.life.toFixed(1),
    })),
    lastDrops: () => [...lastDrops],
    pickupCount: () => pickups.count(),
    pickupList: () => pickups.list(),
    spawnLootAt: (x: number, z: number, itemId = 'waffe_mk05_normal') => {
      pickups.spawn(catalogItem(itemId), x, z);
      return { count: pickups.count(), at: [x, z], item: itemId };
    },
    shopTiles: () => shopField.positions.map((t) => ({ x: t.x, z: t.z })),
    onShopTile: () => shopField.isOnTile(playerCombatant.x, playerCombatant.z),
    playerInvuln: () => playerCombatant.invulnerable === true,
    shopOpen: () => shop.isOpen(),
    nearestTile: () => shopField.nearest(playerCombatant.x, playerCombatant.z),
    inspect: () => ({ open: inspecting, simSpeed: clock.simSpeed, hovered: hoveredId }),
    logTail: (n?: number) => alog.tail(n),
    runId: () => alog.runId(),
    buffs: () => playerBuffs.active(),
    buffMods: () => playerBuffs.aggregate(),
    belt: () => belt.slots().map((b) => b?.id ?? null),
    giveBooster: (id: string) => {
      const b = BOOSTERS.find((x) => x.id === id);
      if (b) belt.add(b);
      updateBeltHud();
      return belt.slots().map((s) => s?.id ?? null);
    },
    triggerBelt: (i: number) => { triggerBelt(i); return belt.slots().map((s) => s?.id ?? null); },
    overpressure: () => ({ shots: overpressureShots, mul: overpressureMul }),
    playerSpeedNow: () => playerSpeed,
    mapOpen: () => overviewMap.isOpen(),
    openInspect: (id: string) => { openInspect(id); return { open: inspecting, simSpeed: clock.simSpeed }; },
    enemyInfoOf: (id: string) => {
      const e = roster.find((r) => r.id === id);
      return e ? buildEnemyInfo({ ...e, speed: ENEMY_SPEED, level: e.prog.level, activeBuffs: e.buffs.active().map((b) => b.label ?? b.id) }, akteBuch.get(e.id) ?? null) : null;
    },
    enemyState: (id: string) => {
      const e = roster.find((r) => r.id === id);
      return e
        ? {
            id: e.id, name: e.displayName, level: e.prog.level, mk: e.prog.unlockedMk(),
            credits: e.credits, shopState: e.shopState,
            bag: e.bag.map((i) => i.id), equip: e.equipment.map((i) => i.id),
            shopGoal: e.shopGoal, x: +e.combatant.x.toFixed(1), z: +e.combatant.z.toFixed(1),
          }
        : null;
    },
    shoppers: () =>
      roster
        .filter((e) => e.shopGoal)
        .map((e) => ({ id: e.id, name: e.displayName, goal: e.shopGoal, bag: e.bag.length })),
    seedEnemyShop: (id?: string, nearTile = true) => {
      const e = id ? roster.find((r) => r.id === id) : roster.find((r) => r.combatant.alive);
      if (!e) return 'none';
      e.bag.push(catalogItem('waffe_mk01_normal'), catalogItem('turm_mk01_normal'));
      e.credits += 500;
      e.shopState = 'shop_anfahrt';
      e.shopGoal = null;
      if (nearTile) {
        const t = shopField.positions[0]!; // (40,0): Gegner knapp daneben absetzen → schnelle Ankunft
        e.view.root.position.set(t.x - 9, 0, t.z);
        e.combatant.x = t.x - 9;
        e.combatant.z = t.z;
      }
      return { id: e.id, name: e.displayName, bagNow: e.bag.length, credits: e.credits };
    },
    teleportToTile: () => {
      const t = shopField.positions[0]!;
      tank.view.root.position.set(t.x, 0, t.z);
      playerCombatant.x = t.x;
      playerCombatant.z = t.z;
      return { x: t.x, z: t.z };
    },
    teleportTo: (x: number, z: number) => {
      tank.view.root.position.set(x, 0, z);
      playerCombatant.x = x;
      playerCombatant.z = z;
      return { x, z };
    },
    respawnPlayer: () => {
      respawnPlayer();
      return {
        alive: playerCombatant.alive,
        hp: Math.round(playerCombatant.hp),
        maxHp: Math.round(playerCombatant.maxHp),
        pos: [+playerCombatant.x.toFixed(1), +playerCombatant.z.toFixed(1)],
        invulnerable: playerCombatant.invulnerable === true,
      };
    },
    enemyVolley: (shots = 5, dmg = 30) => {
      for (let i = 0; i < shots; i++) {
        pool.acquire({
          x: playerCombatant.x, y: 0.5, z: playerCombatant.z,
          dx: 1, dz: 0, speed: 0.05, life: 0.6, team: 'enemy', damage: dmg,
        });
      }
      return 'volley ' + shots + 'x' + dmg;
    },
    equip,
    collectLoot,
    geld: () => geld,
    shop,
    progression: () => ({
      level: progression.level, xp: progression.xp,
      xpToNext: progression.xpToNext(), mk: progression.unlockedMk(),
    }),
    addXp: (n: number) => progression.addXp(n),
    rosterFull: () =>
      roster.map((e) => ({ name: e.displayName, alive: e.combatant.alive, respawn: +e.respawnTimer.toFixed(1), named: e.named !== null })),
    smite: (name: string) => {
      const e = roster.find((r) => r.displayName === name && r.combatant.alive);
      if (!e) return 'nicht gefunden';
      pool.acquire({ x: e.combatant.x, y: 0.5, z: e.combatant.z, dx: 1, dz: 0, speed: 1, life: 0.5, team: 'player', damage: 999999 });
      return 'smite ' + name;
    },
  };

  // §21.5-Sichtbarkeitszähler periodisch loggen (aktiv == sichtbar)

  // GENAU EIN Loop. Reihenfolge: Steuerung -> Pool-Logik -> Boden-Recenter -> Mesh-Sync.
  startLoop(engine, scene, clock, (simDt) => {
    simTime += simDt;
    // SH2: Buffs altern, effektive Spieler-Stats (Tempo/Rüstung) = Loadout × Buffs.
    fireCd -= simDt;
    playerBuffs.tick(simDt);
    const pmods = playerBuffs.aggregate();
    const pst = loadout.stats();
    playerSpeed = pst.speed * pmods.speedMul;
    playerCombatant.armor = pst.armor + pmods.armorAdd;
    playerCombatant.dodge = pst.dodge + pmods.dodgeAdd; // Ausweichen aus Modulen + Buffs
    playerCombatant.incomingMul = pmods.incomingMul; // Verwundbarkeit (falls Gegner später markieren)
    buffHud.update(playerBuffs.active());
    input.update(simDt);
    reticle.update(input.getAimTarget()); // gleicher Frame wie der Turm
    pool.update(simDt);
    updateFx(simDt); // Laser/Rauch-Effekte altern lassen
    if (ownInv.isOpen()) { // Inventar läuft live mit (Beute/Statänderungen), gedrosselt
      ownInvRefreshCd -= simDt;
      if (ownInvRefreshCd <= 0) { ownInvRefreshCd = 0.5; ownInv.refresh(); }
    }

    const px = tank.view.root.position.x;
    const pz = tank.view.root.position.z;

    // SH3.5: Sekundärwaffe (Auto-Turret) feuert autonom auf den nächsten Gegner.
    const sek = loadout.get('sekundaer');
    if (sek?.autoFire) {
      const st: AutoTurretState = {
        cooldown: playerTurretCd, range: sek.autoFire.range,
        fireInterval: sek.autoFire.fireInterval, damage: sek.autoFire.damage, accuracy: sek.autoFire.accuracy,
      };
      const cands = roster.filter((e) => e.combatant.alive).map((e) => ({ x: e.combatant.x, z: e.combatant.z }));
      const res = stepAutoTurret(px, pz, st, cands, simDt, () => aiRng.next());
      playerTurretCd = st.cooldown;
      if (res.fire && res.dir != null) {
        fireAutoTurret(px, pz, res.dir, 'player', sek.autoFire.damage, sek.autoFire.range);
        alog.log('autoturret', { team: 'player', dmg: sek.autoFire.damage });
      }
    }

    // Bewegung gesampelt loggen (simDt=0 bei Pause → kein Spam).
    moveLogCd -= simDt;
    if (moveLogCd <= 0) {
      moveLogCd = 0.5;
      alog.log('move', { x: +px.toFixed(1), z: +pz.toFixed(1), hp: Math.round(playerCombatant.hp), geld });
    }

    // Permanenter Nachschub (P1): VOR dem KI-/Promotion-Teil.
    const aliveCount = roster.reduce((n, e) => n + (e.combatant.alive ? 1 : 0), 0);
    const spawned = spawner.update(simDt, px, pz, aliveCount);
    if (spawned) roster.push(spawned);

    // Gegner-KI (M2): jeder Gegner jagt den lohnendsten Ziel-Panzer (Beutewert).
    const allC = liveCombatants();
    for (const e of roster) {
      if (!e.combatant.alive) {
        // Gefallener benannter Rivale: Countdown bis zur Rückkehr (Nemesis).
        if (e.respawnTimer > 0) {
          e.respawnTimer -= simDt;
          if (e.respawnTimer <= 0) {
            const ang = aiRng.next() * Math.PI * 2;
            const rr = 60 + aiRng.next() * 70; // zufällige, weit gestreute Rückkehr-Position
            e.view.root.position.set(px + Math.cos(ang) * rr, 0, pz + Math.sin(ang) * rr);
            e.equipment = rollEnemyEquipment(e.prog.level, () => aiRng.next()); // frische Ausrüstung passend zum aktuellen Level
            applyEnemyStats(e); // Stats aus der frischen Ausrüstung (HP voll)
            e.combatant.alive = true;
            e.spawnInvulnCd = 5; // Wiederkehr = Erscheinen → 5s Gnadenzeit
            e.view.root.setEnabled(true);
            e.prevTargetVisible = false; // Wiedererkennungs-Spruch beim nächsten Sichtkontakt
            log.info('Rivale kehrt zurück', { name: e.displayName });
          }
        }
        continue;
      }
      const er = e.view.root;
      const ex = er.position.x;
      const ez = er.position.z;

      e.spawnInvulnCd = Math.max(0, e.spawnInvulnCd - simDt); // 5s Gnadenzeit nach Erscheinen
      e.combatant.invulnerable = e.spawnInvulnCd > 0; // (Shop-Dwell setzt unten ggf. wieder true)
      e.buffs.tick(simDt); // Booster-Buffs altern jeden Frame

      // Ziel wählen (Beutewert) — zuerst, da Shop-Trip UND Engagement es brauchen.
      const cands: TargetInfo[] = [];
      for (const c of allC) {
        if (c.id === e.id) continue;
        cands.push({ id: c.id, team: c.team, x: c.x, z: c.z, lootValue: c.lootValue ?? 0, alive: c.alive });
      }
      const target = pickTarget(ex, ez, e.combatant.team, ENEMY_SIGHT, cands);
      const targetComb = target ? allC.find((c) => c.id === target.id) ?? null : null;
      const targetHpFrac = targetComb && targetComb.maxHp > 0 ? targetComb.hp / targetComb.maxHp : 1;
      const targetDist = target ? Math.hypot(target.x - ex, target.z - ez) : Infinity;

      // — Shop-Trip: Dwell (Einkauf am Feld, Schutzzone) —
      if (e.shopState === 'shop_dwell') {
        e.mode = 'einkauf';
        e.combatant.invulnerable = true;
        e.dwellTimer -= simDt;
        if (e.dwellTimer <= 0) {
          const res = planPurchases({
            credits: e.credits, equipment: e.equipment, mk: e.prog.unlockedMk(),
            bag: e.bag, beltFree: e.belt.slots().filter((s) => s === null).length,
          });
          e.credits = res.credits;
          e.bag = [];
          if (res.bought > 0) { e.equipment = res.equipment; applyEnemyStats(e); }
          for (const b of res.boostersBought) e.belt.add(b);
          e.shopGoal = null;
          e.shopState = 'kaempfen';
          e.combatant.invulnerable = false;
          log.debug('Gegner geshoppt', {
            id: e.id, gekauft: res.bought, booster: res.boostersBought.length, rest: res.credits,
          });
        }
        e.combatant.x = er.position.x; e.combatant.z = er.position.z;
        continue;
      }
      // — Shop-Trip: Anfahrt (nicht unterbrechbar, außer durch kaum-HP-Störer) —
      if (e.shopState === 'shop_anfahrt') {
        if (!e.shopGoal) {
          const t = shopField.nearest(ex, ez);
          if (t) e.shopGoal = { x: t.x, z: t.z };
          else e.shopState = 'kaempfen'; // kein Feld erreichbar → normal weiter
        }
        const weakIntruder = target != null && targetDist <= shotRange && targetHpFrac < ENEMY_INTERRUPT_HP;
        if (e.shopGoal && !weakIntruder) {
          e.mode = 'zum_shop';
          const sgx = e.shopGoal.x - ex, sgz = e.shopGoal.z - ez;
          const sd = Math.hypot(sgx, sgz) || 1;
          if (sd <= TILE_RADIUS) {
            e.shopState = 'shop_dwell'; e.dwellTimer = SHOP_DWELL;
          } else {
            const step = ENEMY_SPEED * simDt;
            er.position.x += (sgx / sd) * step;
            er.position.z += (sgz / sd) * step;
            er.rotation.y = Math.atan2(sgx, sgz);
          }
          e.combatant.x = er.position.x; e.combatant.z = er.position.z;
          continue; // Trip nicht durch normale Gegner unterbrechen
        }
        // weakIntruder in Reichweite → unten normal kämpfen (Trip bleibt 'shop_anfahrt')
      }

      // S4: Beute einsammeln (Schatzjäger jagen aktiv aus der Ferne, andere nur ganz nah) — nicht auf dem Shop-Trip.
      if ((e.shopState === 'kaempfen' || e.shopState === 'streifen') && e.bag.length < ENEMY_BAG_MAX) {
        const lootSight = e.motiveId === 'schatzjaeger' ? LOOT_SIGHT_HUNTER : LOOT_SIGHT_NEAR;
        const loot = pickups.nearest(ex, ez, lootSight);
        if (loot) {
          if (loot.dist <= PICKUP_REACH) {
            const got = pickups.collectAt(ex, ez, PICKUP_REACH);
            if (got) {
              e.bag.push(got);
              log.debug('Gegner sammelt Beute', { id: e.id, item: got.id, bag: e.bag.length });
            }
          } else {
            const step = ENEMY_SPEED * simDt;
            er.position.x += ((loot.x - ex) / loot.dist) * step;
            er.position.z += ((loot.z - ez) / loot.dist) * step;
            er.rotation.y = Math.atan2(loot.x - ex, loot.z - ez);
            e.combatant.x = er.position.x;
            e.combatant.z = er.position.z;
            continue; // jagt Beute statt zu kämpfen
          }
        }
      }

      // (Ziel bereits oben gewählt: target / targetDist / targetHpFrac.)

      // Engagement-Zonen-KI (erste Fassung): jede Lage erzeugt Bewegung — kein totes
      // Stehen. Kein Ziel in Sicht → scouten (in eine Richtung fahren, neue Ziele finden).
      e.scoutCd -= simDt;
      if (e.scoutCd <= 0) {
        e.scoutCd = 3 + aiRng.next() * 3;
        e.scoutDir = aiRng.next() * Math.PI * 2;
      }
      const out = engagementStep({
        selfX: ex,
        selfZ: ez,
        target: target ? { x: target.x, z: target.z, dist: Math.hypot(target.x - ex, target.z - ez) } : null,
        hpFrac: e.combatant.hp / e.combatant.maxHp,
        fireRange: shotRange,
        keepDist: ENEMY_KEEP_DIST,
        fleeHp: 0.25,
        scoutDir: e.scoutDir,
      });
      e.mode = out.mode;

      const mods = e.buffs.aggregate();
      e.combatant.incomingMul = mods.incomingMul; // Zielmarkierung → verwundbar
      if (out.moveX !== 0 || out.moveZ !== 0) {
        const step = ENEMY_SPEED * mods.speedMul * simDt;
        er.position.x += out.moveX * step;
        er.position.z += out.moveZ * step;
        er.rotation.y = Math.atan2(out.moveX, out.moveZ); // Chassis in Laufrichtung
      }
      // Turm auf den Blickpunkt richten (Ziel bzw. Scout-Richtung), Chassis herausgerechnet.
      {
        const yaw = Math.atan2(out.faceX - er.position.x, out.faceZ - er.position.z);
        e.view.turretNode.rotation.y = yaw - er.rotation.y;
      }
      e.fireCd -= simDt;
      if (out.fire && e.fireCd <= 0) {
        const dmg = e.damage * mods.damageMul * (e.overShots > 0 ? e.overMul : 1);
        if (e.overShots > 0) e.overShots--;
        enemyFire(er.position.x, er.position.z, out.faceX, out.faceZ, e.combatant.team, dmg);
        e.fireCd = ENEMY_FIRE_COOLDOWN / mods.fireRateMul;
      }

      // Booster-Einsatz-KI: nach HP/Modus zünden (mit Sperre dazwischen).
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

      // SH3.5: Sekundärwaffe (Auto-Turret) des Gegners — feuert autonom auf fremde Teams.
      const esek = e.equipment.find((it) => it.autoFire);
      if (esek?.autoFire) {
        const st2: AutoTurretState = {
          cooldown: e.autoTurretCd, range: esek.autoFire.range,
          fireInterval: esek.autoFire.fireInterval, damage: esek.autoFire.damage,
          accuracy: Math.max(0, Math.min(1, esek.autoFire.accuracy + mods.accuracyAdd)), // Rauch senkt Treffsicherheit
        };
        const ecands = allC.filter((c) => c.team !== e.combatant.team && c.alive).map((c) => ({ x: c.x, z: c.z }));
        const r2 = stepAutoTurret(er.position.x, er.position.z, st2, ecands, simDt, () => aiRng.next());
        e.autoTurretCd = st2.cooldown;
        if (r2.fire && r2.dir != null) {
          fireAutoTurret(er.position.x, er.position.z, r2.dir, e.combatant.team, esek.autoFire.damage, esek.autoFire.range);
          alog.log('autoturret', { team: e.combatant.team, dmg: esek.autoFire.damage });
        }
      }

      // Trip-Auslöser: genug Geld (~2 Items) & gerade Ruhe → zum nächsten Shop-Feld.
      if (e.shopState === 'kaempfen' || e.shopState === 'streifen') {
        const inCombat = target != null && targetDist <= shotRange;
        if (shouldStartShopTrip({ credits: e.credits, mk: e.prog.unlockedMk(), inCombat })) {
          const t = shopField.nearest(ex, ez);
          if (t) { e.shopGoal = { x: t.x, z: t.z }; e.shopState = 'shop_anfahrt'; }
        }
      }

      // (Reveal nur EINMAL bei der Promotion — kein wiederholter Wiedererkennungs-Spruch.)

      e.combatant.x = er.position.x;
      e.combatant.z = er.position.z;
    }

    // Spieler-Combatant spiegeln. Schutzzone: auf einem Shop-Feld unverwundbar.
    playerCombatant.x = px;
    playerCombatant.z = pz;
    const onShopTile = shopField.isOnTile(px, pz);
    spawnGraceCd = Math.max(0, spawnGraceCd - simDt);
    playerCombatant.invulnerable = onShopTile || spawnGraceCd > 0;
    if (shop.isOpen() && !onShopTile && spawnGraceCd <= 0) shop.close(); // Feld verlassen → Shop schließt (außer in der Gnadenzeit)
    combat.update();

    // Beute einsammeln: fährt der Spieler über ein Teil → ins Inventar (Tasche).
    shopField.update();
    pickups.update(px, pz, PICKUP_REACH, collectLoot);
    lootLabels.update(pickups.list()); // Item-Namen über den Würfeln
    shop.updateMoney(); // nur die Geld-Anzeige (NICHT das Panel neu bauen → Klicks bleiben heil)

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
    minimap.update(playerCombatant.x, playerCombatant.z, [
      ...shopField.positions.map((t) => ({ x: t.x, z: t.z, color: '#22b0e6', r: 4.5 })),
      ...roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({ x: e.combatant.x, z: e.combatant.z, color: e.named ? '#ff3b30' : '#e8a23c' })),
    ]);
    // HP-Balken schweben über den Gegnern.
    enemyBars.update(
      roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({
          x: e.combatant.x,
          z: e.combatant.z,
          hpFrac: e.combatant.hp / e.combatant.maxHp,
          name: e.displayName,
          isNamed: e.named !== null,
          mode: e.mode,
          level: e.prog.level,
          mk: e.prog.unlockedMk(),
          marks: e.buffs.active().reduce(
            (s, b) => s + (b.id === 'markiert' ? '🎯' : b.id === 'vernebelt' ? '💨' : ''),
            '',
          ),
        })),
    );

    // P0: Hover-Pick (Gegner unter dem Mauszeiger) + Übersichtskarte (M).
    const screenBlips: ScreenBlip[] = [];
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const s = Vector3.Project(
        new Vector3(e.combatant.x, 1.4, e.combatant.z),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );
      if (s.z > 0 && s.z < 1) screenBlips.push({ id: e.id, sx: s.x, sy: s.y });
    }
    hoveredId = inspecting ? null : nearestToPointer(mouseX, mouseY, screenBlips, 70);
    const hb = hoveredId ? screenBlips.find((b) => b.id === hoveredId) : null;
    if (hb && !overviewMap.isOpen()) {
      inspectPrompt.style.display = 'block';
      inspectPrompt.style.left = hb.sx + 'px';
      inspectPrompt.style.top = hb.sy - 24 + 'px';
    } else {
      inspectPrompt.style.display = 'none';
    }
    if (overviewMap.isOpen()) {
      const mapBlips: MapBlip[] = [
        ...shopField.positions.map((t) => ({ x: t.x, z: t.z, color: '#22b0e6', r: 5 })),
        ...roster
          .filter((e) => e.combatant.alive)
          .map((e) => ({
            id: e.id, x: e.combatant.x, z: e.combatant.z,
            color: e.named ? '#ff3b30' : '#e8a23c', r: e.named ? 6 : 4,
            name: e.displayName, isNamed: e.named !== null,
            sub: `Lvl ${e.prog.level} · MK${enemyMk(e.prog.level)} · ${MOTIV_LABEL[e.motiveId] ?? e.motiveId}`,
            hpFrac: e.combatant.hp / e.combatant.maxHp,
          })),
      ];
      overviewMap.update(playerCombatant.x, playerCombatant.z, mapBlips, mouseX, mouseY);
    }

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
      heading: +tank.view.root.rotation.y.toFixed(3),
      playerHp: playerCombatant.hp,
      playerAlive: playerCombatant.alive,
      enemyCount: roster.filter((e) => e.combatant.alive).length,
      nearestEnemyId: hudEnemy?.id ?? null,
      enemyHp: hudEnemy ? hudEnemy.combatant.hp : 0,
      enemyAlive: hudEnemy !== null,
      enemyNamed: hudEnemy?.named?.name ?? null,
      enemyMode: hudEnemy?.mode ?? 'none',
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
