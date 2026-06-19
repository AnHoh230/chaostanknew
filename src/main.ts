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
import { MOTIVE_PRESETS } from './ai/motives';
import type { AiWorldView, TraitProfile } from './ai/aiTypes';
import { createAkteBuch } from './named/akte';
import { generateNamed, istKnapperSieg, type Named } from './named/promotion';
import { createReveal } from './reveal/reveal';
import { createHud } from './ui/hud';
import { createMinimap } from './ui/minimap';
import { TANK_CLASSES, type TankClass } from './game/classes';
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
const ENEMY_SPAWN = { x: 14, z: 10 };
const ENEMY_SPEED = 5; // langsamer als der Spieler (8)
const ENEMY_SIGHT = 60; // Sichtweite auf das Ziel
const ENEMY_KEEP_DIST = 7; // beim Annähern nicht in den Spieler hineinlaufen
const ENEMY_DAMAGE = 8; // Schaden eines Gegner-Treffers am Spieler
const ENEMY_FIRE_COOLDOWN = 1.1; // Sekunden zwischen Gegner-Schüssen
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
  let revealShown = false;
  let prevEnemyVisible = false;

  // Projektil-Pool (rein logisch) + sichtbare Mesh-Brücke
  const pool = createProjectilePool(PROJECTILE_CAPACITY);
  const projectileView = createProjectileView(scene, pool, PROJECTILE_CAPACITY);

  // Gegner-Panzer (Slice 1b-1: steht, ist treffbar, stirbt).
  const enemyComp: TankComposition = {
    chassis: 'c_box',
    wheels: 'w_round',
    turret: 't_small',
    weapon: 'g_short',
  };
  const enemyView = createTankView(scene, enemyComp);
  enemyView.root.position.set(ENEMY_SPAWN.x, 0, ENEMY_SPAWN.z);
  const enemyTank = createTank('enemy', enemyView, 100);

  // Combatants: Datenmodell für Treffer/HP (Position pro Frame aus den Roots gespiegelt).
  const playerCombatant: Combatant = {
    id: 'player', team: 'player', x: 0, z: 0, radius: TANK_RADIUS, hp: tank.hp, maxHp: cls.maxHp, alive: true,
  };
  const enemyCombatant: Combatant = {
    id: 'enemy', team: 'enemy', x: ENEMY_SPAWN.x, z: ENEMY_SPAWN.z, radius: TANK_RADIUS,
    hp: enemyTank.hp, maxHp: 100, alive: true,
  };
  const combatants: Combatant[] = [playerCombatant, enemyCombatant];

  // Motiv-KI + Duell-Gedächtnis (vor dem Kampf-System: dessen Tod-Handler nutzt beides).
  const aiRng = createRng(SEED + 7);
  let enemyTraits: TraitProfile = { ...MOTIVE_PRESETS.aasgeier! };
  let enemyBrain = createEnemyBrain(enemyTraits, () => aiRng.next());
  let enemyAction = 'idle';
  const akteBuch = createAkteBuch();
  let enemyNamed: Named | null = null;

  const combat = createCombatSystem(pool, () => combatants, {
    damage: HIT_DAMAGE,
    projectileRadius: PROJECTILE_RADIUS,
    onHit: (h) => log.debug('hit', { target: h.target.id, hp: h.target.hp, lethal: h.lethal }),
    onDeath: (t) => {
      if (t.id === 'player') {
        log.warn('player died', {});
        bus.emit('tank.died', { tankId: 'player' });
        return;
      }
      // Gegner würde sterben: bei knappem Spieler-Sieg PROMOTION statt Tod.
      const playerFrac = playerCombatant.hp / playerCombatant.maxHp;
      akteBuch.record('enemy', { ausgang: 'sieg', playerHpFrac: playerFrac });
      if (istKnapperSieg(playerFrac) && !enemyNamed) {
        const named = generateNamed('knapper_sieg', () => aiRng.next());
        akteBuch.promote('enemy', named);
        enemyNamed = named;
        enemyTraits = { ...enemyTraits, ...named.traitOverlay }; // rachsüchtig, flieht nie
        enemyBrain = createEnemyBrain(enemyTraits, () => aiRng.next());
        enemyCombatant.alive = true; // Lebensschub statt Tod
        enemyCombatant.hp = LEBENSSCHUB;
        log.info('PROMOTION: der Rasende erwacht', {
          name: named.name, perks: named.perks, atPlayerHp: +playerFrac.toFixed(2),
        });
        reveal.triggerReveal(named, enemyView.root, akteBuch.get('enemy')!);
        revealShown = true;
      } else {
        akteBuch.archive('enemy');
        enemyView.root.setEnabled(false);
        bus.emit('tank.died', { tankId: 'enemy' });
        log.info('enemy died', { signaturTeilDrop: enemyNamed?.signaturTeil ?? null });
      }
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
      damage: cls.damage,
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

  // Gegner feuert auf den Spieler (team 'enemy', eigener Schaden).
  let enemyFireCd = ENEMY_FIRE_COOLDOWN;
  function enemyFire(ox: number, oz: number, tx: number, tz: number): void {
    const dx = tx - ox;
    const dz = tz - oz;
    const l = Math.hypot(dx, dz) || 1;
    const p = pool.acquire({
      x: ox, y: 0.5, z: oz, dx: dx / l, dz: dz / l,
      speed: PROJECTILE_SPEED, life: PROJECTILE_LIFE, team: 'enemy', damage: ENEMY_DAMAGE,
    });
    if (p) bus.emit('projectile.spawned', { id: p.id });
  }

  const input = createInput(scene, camera, tank, cls.speed, fire);

  // OS-Mauszeiger über dem Canvas ausblenden — das Spiel zeichnet sein eigenes
  // Fadenkreuz, das frame-synchron mit dem Turm läuft (kein Render-Weg-Versatz).
  canvas.style.cursor = 'none';
  const reticle = createReticle(scene);

  // HUD (Spieler/Gegner-HP) + Minimap (Named = roter Punkt = Wiedererkennung auf der Karte).
  const hud = createHud();
  const minimap = createMinimap();

  // Mess-Overlay (Phase 1 Debugging): macht Cursor-Bodenpunkt, Ziel und Schussrichtung sichtbar.
  const aimDebug = createAimDebug(scene, camera, tank, () => input.getAimTarget());

  // Debug-Hooks für deterministische Verifikation (Promotion etc.).
  (window as unknown as { __dbg: unknown }).__dbg = {
    player: playerCombatant,
    enemy: enemyCombatant,
    akte: () => akteBuch.all(),
    named: () => enemyNamed,
  };

  // §21.5-Sichtbarkeitszähler periodisch loggen (aktiv == sichtbar)

  // GENAU EIN Loop. Reihenfolge: Steuerung -> Pool-Logik -> Boden-Recenter -> Mesh-Sync.
  startLoop(engine, scene, clock, (simDt) => {
    simTime += simDt;
    input.update(simDt);
    reticle.update(input.getAimTarget()); // gleicher Frame wie der Turm
    pool.update(simDt);

    // Gegner-KI (Slice 1b-2): Welt lesen → Aktion wählen → danach bewegen.
    if (enemyCombatant.alive) {
      const er = enemyTank.view.root;
      const ex = er.position.x;
      const ez = er.position.z;
      const px = tank.view.root.position.x;
      const pz = tank.view.root.position.z;
      const dPlayer = Math.hypot(px - ex, pz - ez) || 1;
      const dHome = Math.hypot(ENEMY_SPAWN.x - ex, ENEMY_SPAWN.z - ez) || 0;
      const world: AiWorldView = {
        selfHpFrac: enemyCombatant.hp / enemyCombatant.maxHp,
        targetVisible: dPlayer < ENEMY_SIGHT,
        distance: dPlayer,
        homeDistance: dHome,
        groupSize: 0,
        lootValue: 0.4,
      };
      enemyAction = enemyBrain.update(world, simDt);

      let mx = 0;
      let mz = 0;
      if (enemyAction === 'annähern' && dPlayer > ENEMY_KEEP_DIST) {
        mx = (px - ex) / dPlayer;
        mz = (pz - ez) / dPlayer;
      } else if (enemyAction === 'fliehen') {
        mx = (ex - px) / dPlayer;
        mz = (ez - pz) / dPlayer;
      } else if (enemyAction === 'Revier_halten' && dHome > 1) {
        mx = (ENEMY_SPAWN.x - ex) / dHome;
        mz = (ENEMY_SPAWN.z - ez) / dHome;
      }
      if (mx !== 0 || mz !== 0) {
        const step = ENEMY_SPEED * simDt;
        er.position.x += mx * step;
        er.position.z += mz * step;
        er.rotation.y = Math.atan2(mx, mz); // Chassis in Laufrichtung drehen
      }

      // Turm IMMER auf den Spieler richten (Rohr = Schussrichtung). Turm ist Kind
      // des Roots, deshalb die Chassis-Drehung herausrechnen.
      if (world.targetVisible) {
        const turretWorldYaw = Math.atan2(px - er.position.x, pz - er.position.z);
        enemyTank.view.turretNode.rotation.y = turretWorldYaw - er.rotation.y;
      }

      // Auf Sicht zurückfeuern (so kann die Spieler-HP fallen → knapper Sieg).
      enemyFireCd -= simDt;
      if (world.targetVisible && enemyFireCd <= 0) {
        enemyFire(er.position.x, er.position.z, px, pz);
        enemyFireCd = ENEMY_FIRE_COOLDOWN;
      }

      // Wiedererkennung: erneut in Sicht NACH erfolgtem Reveal → anderer Spruch, kein Reveal.
      if (revealShown && enemyNamed && world.targetVisible && !prevEnemyVisible && !reveal.active()) {
        reveal.triggerRecognition(enemyNamed, er, akteBuch.get('enemy')!);
      }
      prevEnemyVisible = world.targetVisible;
    }

    // Combatant-Positionen aus den Panzer-Roots spiegeln, dann Treffer auflösen.
    playerCombatant.x = tank.view.root.position.x;
    playerCombatant.z = tank.view.root.position.z;
    enemyCombatant.x = enemyTank.view.root.position.x;
    enemyCombatant.z = enemyTank.view.root.position.z;
    combat.update();

    ground.update();
    projectileView.sync();
    aimDebug.update();
    reveal.update(engine.getDeltaTime() / 1000); // Echtzeit (HUD/Slowmo-Fade läuft real)

    // HUD + Minimap (Echtzeit). Named-Gegner = roter Punkt/Balken.
    hud.update({
      playerHp: playerCombatant.hp,
      playerMaxHp: playerCombatant.maxHp,
      enemyHp: enemyCombatant.hp,
      enemyMaxHp: enemyCombatant.maxHp,
      enemyAlive: enemyCombatant.alive,
      enemyName: enemyNamed ? enemyNamed.name : null,
    });
    minimap.update(
      playerCombatant.x,
      playerCombatant.z,
      enemyCombatant.alive
        ? [{ x: enemyCombatant.x, z: enemyCombatant.z, color: enemyNamed ? '#ff3b30' : '#e8a23c' }]
        : [],
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
      enemyHp: enemyCombatant.hp,
      enemyAlive: enemyCombatant.alive,
      enemyNamed: enemyNamed ? enemyNamed.name : null,
      enemyAction,
      enemyX: +enemyTank.view.root.position.x.toFixed(2),
      enemyZ: +enemyTank.view.root.position.z.toFixed(2),
      enemyScreen: (() => {
        const s = Vector3.Project(
          enemyTank.view.root.getAbsolutePosition(),
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
