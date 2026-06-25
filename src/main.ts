import { Engine, Scene, HemisphericLight, Vector3, Color4, Matrix, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
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
import { createStyleTracker } from './doctrine/styleTracker';
import { createDoctrineDirector } from './doctrine/doctrineDirector';
import { DOCTRINES, DECAY, BANDS } from './doctrine/doctrineConfig';
import { planSwarm, type SwarmDirection } from './doctrine/spawnPlan';
import { emptyProfile, STATIONARY_SPEED, type PlayerStyleProfile } from './doctrine/styleProfile';
import { createEnemyEntity, type Enemy, type EnemySpec } from './enemy/enemy';
import { enemyMk } from './enemy/enemyStats';
import { createSpawner } from './enemy/spawner';
import { behaviorTarget } from './enemy/enemyBehavior';
import { ENEMY_TYPES } from './enemy/enemyTypes';
import { createPlayerBar } from './ui/playerBar';
import { installUiScale } from './ui/uiScale';
import { createMinimap } from './ui/minimap';
import { createEnemyBars } from './ui/enemyBars';
import { createFloatingNumbers } from './ui/floatingNumbers';
import { createSwarmHud } from './ui/swarmHud';
import { createHeatHud } from './ui/heatHud';
import { createOverviewMap, type MapBlip } from './ui/overviewMap';
import { createInspectCard } from './ui/inspectCard';
import { buildEnemyInfo } from './inspect/enemyInfo';
import { nearestToPointer, type ScreenBlip } from './inspect/enemyPick';
import { createBuffStack } from './combat/buffs';
import { createBuffHud } from './ui/buffHud';
import { createActionLog } from './debug/actionLog';
import { enemyRelative } from './debug/enemyRel';
import { createRunMetrics } from './debug/runMetrics';
import { createTunables } from './ui/tunables';
import { createTuningPanel } from './ui/tuningPanel';
import { TANK_CLASSES } from './game/classes';
import { computeFlowState, pruneDeathTimes, type FlowState } from './game/flowState';
import { ROSTER, DEFAULT_ESCALATION, scaleStats } from './enemy/roster';
import { saeGift, tickGift, istReif, reifeStufe, giftSlow, DEFAULT_GARTEN } from './build/garten';
import { gegnerWelle, gartenTypStats, pulkGroesse, BUILD_STUFE_NAME, GARTEN_BASIS } from './build/gartenProgression';
import { createHeatState, updateHeat, DEFAULT_HEAT_CFG, type HeatState } from './build/heatTracker';
import { haescherSoll, haescherStats } from './build/haescher';
import {
  createBefehlState, markiere, trefferArt, registriereKill, bruch,
  aufbauStufe, schadenStufe, tickBefehl, autoMarkBereit,
  MAX_MARKS, BB_CAP, BUFF_TIME,
} from './build/befehl';
import {
  createSkillState, applySkills, chooseUlt, spendTalent, activeUltDef, ULTS, TALENTS,
  HEAL_PRO_ERNTE, EXECUTE_FRAC, AUSBRUCH_RADIUS, AUSBRUCH_FIEBER, PUNKT_KOSTEN, TALENT_MAX,
  type TalentId, type UltId,
} from './build/skilltree';
import {
  befehlUltDef, SEUCHE_LIFESTEAL, createBefehlSkillState, chooseBefehlUlt, spendBefehlTalent,
  BEFEHL_ULTS, BEFEHL_TALENTS, BEFEHL_TALENT_MAX, DAUER_PRO_RANG, CD_PRO_RANG, BEUTE_PRO_RANG, SCHUTZ_NACHLADE_KETTE,
  POL_UEBERMACHT_PRO_RANG, POL_ADERLASS_PRO_RANG, POL_KLAMMER_PRO_RANG, type BefehlUltId, type BefehlTalentId,
} from './build/befehlSkill';
import { thresholdForStage, maxStage, type TuningProfile } from './evolution/profiles';
import { CHANNEL_DISPLAY, type BaseMode, type EvolutionChannelId } from './evolution/channels';
import { createEvolutionState, gainProgress, tryTriggerEvolution } from './evolution/evolution';
import { createCompassState, baryWeights } from './evolution/compass';
import { createProgression } from './progression/progression';
import {
  createPlayerBoni, waehleBoni, randomBoniAuswahl, rollCrit, boniDef, type BoniId,
} from './build/playerBoni';
import {
  createRaumState, legeFeld, feldAn, naechstesFeld, feldRadius, feldSlow, zugZurMitte,
  ernteFeldKill, tickFeld, DEFAULT_RAUM,
} from './build/raum';
import { nachsetzenFaellig, spawnRundum, DEFAULT_NACHSETZ } from './build/nachsetzen';
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
const ENEMY_FIRE_COOLDOWN = 1.4; // Sekunden zwischen Gegner-Schüssen
const DAMAGE_TICK = 0.5; // Länge eines „Ticks" (s) für DoT/AoE-Schaden

/** Kampfstil (Startwahl): bestimmt, wie der Hauptschuss wirkt. */
export type CombatStyle = 'sniper' | 'aoe' | 'dot';
const COMBAT_STYLES: { id: CombatStyle; name: string; desc: string }[] = [
  { id: 'sniper', name: 'Kommandant (Befehl)', desc: 'Scope (Rechtsklick): Ziele markieren und in Reihenfolge exekutieren. B/BB/BBB baut grenzenlos Schaden auf.' },
  { id: 'aoe', name: 'Raum (Felder)', desc: 'Felder ablegen (max 3, FIFO). Gegner darin sterben & werden verlangsamt; RR fängt sie ein, RRR-Ernte macht Felder größer + stärker.' },
  { id: 'dot', name: 'Garten (Gift)', desc: 'Schuss sät Gift wie eine Seuche: Z infiziert, ZZ reift & steckt an, ZZZ erntet — reife sterben am Gift.' },
];

const log = createLogger('main');

function mountStartScreen(onStart: (style: CombatStyle) => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'start-screen';
  overlay.style.cssText =
    'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'gap:20px;background:#0b0d10;z-index:10;font-family:system-ui,sans-serif;';

  const title = document.createElement('div');
  title.textContent = 'Wähle deinen Kampfstil';
  title.style.cssText = 'color:#f0e6cc;font-size:24px;font-weight:700;letter-spacing:0.5px;';
  overlay.appendChild(title);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;justify-content:center;';
  overlay.appendChild(row);

  for (const s of COMBAT_STYLES) {
    const card = document.createElement('button');
    card.style.cssText =
      'width:240px;text-align:left;cursor:pointer;border:2px solid #2a343b;background:#13171c;' +
      'color:#e8e0c8;border-radius:10px;padding:16px;transition:border-color 0.12s,transform 0.12s;';
    card.onmouseenter = () => { card.style.borderColor = '#d8b04a'; card.style.transform = 'translateY(-3px)'; };
    card.onmouseleave = () => { card.style.borderColor = '#2a343b'; card.style.transform = 'none'; };
    card.innerHTML =
      `<div style="font-size:20px;font-weight:700;margin-bottom:6px">${s.name}</div>` +
      `<div style="font:13px/1.45 system-ui;color:#b9b29c;min-height:96px">${s.desc}</div>`;
    card.addEventListener('click', () => { overlay.remove(); onStart(s.id); });
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

function boot(combatStyle: CombatStyle): void {
  const cls = TANK_CLASSES[0]!; // feste Klasse; Wahl ist jetzt der Kampfstil
  log.info('boot start', { seed: SEED, biome: BIOME_ID, stil: combatStyle });

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
  installUiScale(); // globales DOM-HUD-Scaling (CSS-Var --ui-scale + Anker-Klassen) auf große/4K-Displays
  const tunables = createTunables(); // Registry für alle live-stellbaren Magic Numbers

  // Projektil-Pool (rein logisch) + sichtbare Mesh-Brücke
  const pool = createProjectilePool(PROJECTILE_CAPACITY);
  const projectileView = createProjectileView(scene, pool, PROJECTILE_CAPACITY);

  // Live einstellbar (Regler im Panel): Schussweite.
  let shotRange = 40; // Weltеinheiten, die ein SPIELER-Schuss fliegt (Scope erhöht NUR diese)
  let enemyShotRange = 30; // Gegner-Feuerdistanz/Standoff/Projektilreichweite — KÜRZER als Spieler-Schussweite (40): sie müssen erst ranfahren, ehe sie (mit Vorhalt) feuern → kein Kreuzfeuer aus allen Richtungen quer übers Feld. UNABHÄNGIG vom Spieler-Scope
  let playerProjSpeed = 60; // Spieler-Projektiltempo (schneller als Gegner → bewegliche Ziele treffbar)
  // Dash (Shift+WASD): kurzer Burst in Tasten-Richtung (heading-relativ), CD sichtbar im HUD.
  let dashCd = 0, dashTimer = 0, dashDirX = 0, dashDirZ = 0;
  let dashDist = 14, dashDur = 0.16, dashCdMax = 5;
  // Vorerst deaktivierte Gegner-Typen (brauchen mehr Spieler-Gegenmittel, bevor sie fair sind).
  const DISABLED_TYPES = new Set<string>(['flanker']);

  // — Kampfstil-Werte (Regler, Kategorie „Stile") —
  let sniperRange = 95, sniperCamBack = 150, sniperCamHeight = 95; // Scope: Reichweite + Kamera weit weg (mehr Gebiet)
  let sniperDmgMul = 2; // Sniper schlägt härter — Faktor auf den normalen Schussschaden
  let sniperTargets: string[] = []; // Ziele, die der nächste Schuss trifft (Auto-Targeting, jeden Frame neu)
  // GARTEN-BUILD (Z-Z-Z) als SEUCHE: Schuss INFIZIERT (sät Gift) statt Direktschaden. Das Gift reift,
  // drosselt, steckt nahe Panzer an; reif → Panzer steht & stirbt am Gift → Erntefieber-Buff.
  // Aktiver Build — fest für den Test; der Kompass wird ignoriert, ALLES levelt den aktiven Kern.
  //  'garten' = Z/Seuche (dot_core), 'befehl' = B/Kommandant (sniper_core).
  // ARENA_MODE = gemeinsames Gerüst (Spawn/Waffen-Ökonomie/Kamera/Heat) für jeden Arena-Build;
  // GIFT_BUILD nur für die Garten-spezifische Gift-Mechanik (säen/ticken).
  // Build kommt aus der Start-Screen-Wahl (combatStyle): Kommandant→Befehl, AoE→Raum, DoT→Garten.
  // Welche drei Builds im Menü stehen, steuern wir über COMBAT_STYLES — so tauschen wir aus, was testbar ist.
  const BUILD: 'garten' | 'befehl' | 'raum' =
    combatStyle === 'dot' ? 'garten' : combatStyle === 'aoe' ? 'raum' : 'befehl';
  const ARENA_MODE = true;
  const GIFT_BUILD = BUILD === 'garten';
  const ACTIVE_CORE: EvolutionChannelId =
    BUILD === 'garten' ? 'dot_core' : BUILD === 'raum' ? 'aoe_core' : 'sniper_core';
  const gartenCfg = { ...DEFAULT_GARTEN };
  const GARTEN_SNAP_PX = 150; // großzügiger Cursor-Fang fürs manuelle Säen (du wählst die Ziele selbst)
  // Sichtbare Reife (Slot 2): der vergiftete Panzer glüht stufenweise grün→rot, je näher am Erntebruch.
  const GIFT_GLOW = [new Color3(0.04, 0.13, 0.02), new Color3(0.08, 0.3, 0.03), new Color3(0.45, 0.32, 0), new Color3(0.7, 0.06, 0)];
  const GIFT_GREY = new Color3(0.22, 0.22, 0.26); // geerntet: Rot SOFORT weg, fahles Grau (sterbender Bruchkörper)
  const GARTEN_HARVEST_TIME = 0.4; // s grau-Animation nach der Ernte, dann Tod
  let erntefieber = 0; // ZZZ-Buff „Erntefieber": +1 je geerntetem (reif gestorbenem) Panzer — macht reifes Gift tödlicher
  const GIFT_DOT_ST1 = 6; // St 1 (Z): reiner Köchel-DoT pro Tick — tötet langsam, kein Reifen/Ansteckung
  const setEnemyGlow = (e: Enemy, col: Color3): void => {
    for (const m of e.view.root.getChildMeshes()) {
      const mat = m.material as StandardMaterial | null;
      if (mat) mat.emissiveColor = col;
    }
  };
  const setGiftGlow = (e: Enemy, stufe: number): void => setEnemyGlow(e, GIFT_GLOW[stufe] ?? GIFT_GLOW[0]!);
  // Häscher-Optik: dunkles Grau-Schwarz als BASIS-Farbe (nicht nur Glow) — hebt die Vollstrecker ab.
  const HAESCHER_DIFFUSE = new Color3(0.1, 0.1, 0.12);
  const HAESCHER_EMISSIVE = new Color3(0.02, 0.02, 0.03);
  const tintHaescher = (e: Enemy): void => {
    for (const m of e.view.root.getChildMeshes()) {
      const mat = m.material as StandardMaterial | null;
      if (mat) { mat.diffuseColor = HAESCHER_DIFFUSE; mat.emissiveColor = HAESCHER_EMISSIVE; }
    }
  };
  let returnBoostCd = 0; // Kern-Stufe 3: kurzes Tempo-Fenster nach dem Auspacken
  let sniperCrosshair: HTMLDivElement | null = null; // Cursor-Fadenkreuz (grün=bereit / orange=nachladen)
  let markPool: HTMLDivElement[] = []; // Ziel-Ringe um die getroffenen Gegner (1..maxMarks)
  let scopeBadge: HTMLDivElement | null = null; // Scope-Anzeige inkl. aktueller Ziel-Priorität
  // — Routen-Zustand (greifen nach freigeschalteter Stufe; Kompass lenkt nur, WO man wächst) —
  const netMarks: { id: string; left: number }[] = []; // Zielnetz: Marken bleiben liegen + kontaminieren
  let netTickCd = 0;
  let netLinger = 4, netDmg = 8, netSpreadR = 10; // s Restdauer / Schaden je Tick / Streuradius (ab St2)
  const woundPressure = new Map<string, number>(); // Auswahl-Wundbruch: Wunddruck je Ziel
  let woundStep = 20, woundCap = 90, woundBurstDmg = 60, woundBurstR = 14; // Aufbau / Bruch-Schwelle / Bruch-AoE
  let aoeRange = 26; // Raum: Wurfweite — wie weit man ein Feld werfen kann (Größe/Schaden/Slow/Zug kommen aus RAUM_CFG/raum)
  const raum = createRaumState(); // Raum-Build: liegende Felder (FIFO max 3) + Ernte-Buff (RRR)
  const RAUM_CFG = { ...DEFAULT_RAUM }; // tunebare Feld-Config
  const NACHSETZ_CFG = { ...DEFAULT_NACHSETZ }; // Nachsetzen: untätige Gegner in den Fahrtweg setzen (statt Rubberband)
  const feldDiscs: Mesh[] = []; // Boden-Discs, FIFO-synchron zu raum.felder
  let dotDmg = 36, dotEvery = DAMAGE_TICK * 2, dotDur = DAMAGE_TICK * 8; // DoT: alle 2 Ticks, 8 Ticks lang
  let scopeActive = false; // Sniper: RMB GEHALTEN → Scope+Slomo an (kein Fahren, weiter zoomen)
  // Garten-Waffen-Ökonomie: 3 Infektions-Schüsse, dann auf R nachladen (mit Tempo-Schub = mobil).
  let ammo = 3;
  const AMMO_MAX = 3;
  let reloadCd = 0;
  const RELOAD_TIME = 2.2, RELOAD_SPEED = 1.7; // Nachlade-Dauer (s) + Tempo-Faktor währenddessen
  const SLOMO_SCALE = 0.2; // Welt-Zeit im Slomo (Bullet-Time beim Infizieren); Spieler-Feuertakt bleibt real
  let slomoTime = 3; // Slomo-Zeit-Budget pro Magazin (s) — sonst klebt man ewig im Slomo
  const SLOMO_TIME = 3;
  const SLOMO_REGEN = 0.5; // außerhalb des Scopes füllt sich das Slomo-Budget mit diesem Faktor (×Echtzeit) wieder auf
  // — B-Build (Befehl): im Scope MARKIEREN (kostet Munition), nach dem Scope munitionsfrei exekutieren.
  //   Markierte sind verwundbar (mehr Schaden) + langsam (Buff). befehl.ts trägt ab BB Reihenfolge/Kaskade.
  const befehl = createBefehlState();
  let salveOffen = false; // läuft gerade ein Markier-Vorgang? Neue Salve nur bei leeren Marken + voller Munition.
  const MARK_VERWUNDBAR = 1.6; // Schadensfaktor auf markierte Ziele (verwundbar)
  const MARK_SLOW = 0.45; // speedMul-Buff auf Markierte (langsam, wie Gift-Slow)
  const MARK_BUFF_DUR = 30; // s Markier-Buff (lang — hält bis Exekution)
  const BEFEHL_FIRE_BASE = 0.14; // Markier-/Schuss-Takt
  const BEFEHL_STUFE_NAME = ['Grundschuss', 'B · Markieren', 'BB · Aufbau', 'BBB · Grenzenlos', 'Meisterschaft'];
  const BEFEHL_DMG_PRO_STUFE = 10; // additiver Schaden je Aufbau-Stufe (Gift-Größenordnung, KEIN Loadout-Multiplikator) — Balance-Stellschraube
  const KASKADE_SPEED_PRO_KETTE = 0.06; // BB: +6 % Tempo je Ketten-Stufe
  const KASKADE_SPEED_MAX = 0.6; // Deckel des Kaskaden-Tempos (+60 %)
  // Skill-System: ab St3 (ZZZ) werden Impuls-Überschüsse zu Skillpunkten. Eine aktivierte Pol-Ult
  // (Taste/Dauer/CD) + passive Wert-Talente. Talente mutieren gartenCfg + giftDotEff (recomputeSkills).
  const skill = createSkillState();
  let skillProgress = 0; // gesammelter Impuls-Überschuss Richtung nächstem Skillpunkt
  let ultActive = 0, ultCd = 0; // Ult-Timer: s noch aktiv / s noch Cooldown
  const befehlSkill = createBefehlSkillState(); // Ult/Talente werden im Skill-Panel (T) gewählt
  let ultSchaden = 0; // Seuche-Ult: Summe des ausgeteilten Schadens (für Lifesteal am Ende)
  let schutzLadungen = 0; // Eiserne Disziplin: aktuelle Ketten-Schutz-Ladungen
  let prevKette = 0; // für die Kette-≥15-Nachlade-Erkennung
  let prevWelleLevel = 1; // letztes Gegner-Stärke-Level (steigt → bestehende Gegner mit-skalieren)
  let giftDotEff = GIFT_DOT_ST1; // effektiver St1-Köchel (Köchel-Talent hebt ihn)
  const recomputeSkills = (): void => {
    const a = applySkills(DEFAULT_GARTEN, skill);
    Object.assign(gartenCfg, a.cfg); // Talente wirken über die geteilte gartenCfg (saat/reife/…)
    giftDotEff = GIFT_DOT_ST1 + a.st1DotBonus;
  };
  // — Bewegungs-Heat (intern, dem Spieler NICHT angezeigt): treibt den Häscher-Nachschub —
  let heatState: HeatState = createHeatState();
  let haescherSeq = 0, haescherCd = 0; // Häscher-Spawn-Zähler + Nachschub-Takt
  const HAESCHER_SPAWN_CD = 0.8; // s zwischen einzelnen Häscher-Spawns (kein Schlag auf einmal)
  // Eine Ernte (reifer Gift-Tod ODER Gnadenstoß-Execute): grau sterben + Erntefieber + aktive Ult-Effekte.
  const doErnte = (e: Enemy): void => {
    e.combatant.hp = 0; e.combatant.alive = false;
    e.harvested = GARTEN_HARVEST_TIME; e.gift = undefined; setEnemyGlow(e, GIFT_GREY);
    erntefieber += 1;
    if (ultActive > 0 && skill.ult === 'naehrboden') // Zustand-Ult: Ernte heilt
      playerCombatant.hp = Math.min(playerCombatant.maxHp, playerCombatant.hp + HEAL_PRO_ERNTE);
    if (ultActive > 0 && skill.ult === 'ausbruch') { // Raum-Ult: Ernte steckt den Umkreis an
      erntefieber += AUSBRUCH_FIEBER;
      for (const o of roster) {
        if (!o.combatant.alive || o.gift || o.harvested != null) continue;
        if (Math.hypot(o.combatant.x - e.combatant.x, o.combatant.z - e.combatant.z) <= AUSBRUCH_RADIUS) o.gift = saeGift(undefined, gartenCfg);
      }
    }
    showToast(`🦠 ERNTESIEG — Erntefieber +${erntefieber}`);
    alog.log('ernte', { fieber: erntefieber, t: +runClock.toFixed(1) });
  };
  let scopeApplied = false, savedShotRange = 40; // Übergangs-Zustand für den Scope
  let camReturn = 0, camReturnDur = 1; // Scope→Normal-Kamera: sanfte Rückkehr (Befehl: mit Marken langsam)
  const CAM_RETURN_SLOW = 2.5, CAM_RETURN_FAST = 0.25; // s Rückkehr-Dauer mit / ohne Marken

  // Gegner werden dauerhaft nachgespawnt (feste Dichte; Steuerung kommt später über die Doktrin).
  const aiRng = createRng(SEED + 7);
  const roster: Enemy[] = []; // lebende Gegner (dynamisch)
  // — Gegner-Aufkommen (Richtung A): feste, gedeckelte Zahl bedeutsamer Gegner-Panzer
  // (KEIN Schwarm/keine Dichte-aus-Heat mehr). Der Heat bestimmt nur noch die Typ-AUSWAHL.
  const maxEnemiesGet = tunables.add({ label: 'Max Gegner', category: 'Gegner', value: 7, min: 1, max: 24, step: 1 });
  const swarmIntervalGet = tunables.add({ label: 'Spawn-Takt s', category: 'Gegner', value: 1.0, min: 0.2, max: 6, step: 0.1 });
  // — Aktiver Sniper-Roster: Werte je Typ (Basis = Stufe 0) + Heat-Stufen-Eskalation (×/Stufe) —
  const rosterGet: Record<string, { speed(): number; hp(): number; dmg(): number; loot: number }> = {
    allrounder: {
      speed: tunables.add({ label: 'Allrounder-Tempo', category: 'Roster', value: ROSTER.allrounder!.speed, min: 1, max: 20, step: 0.5 }),
      hp: tunables.add({ label: 'Allrounder-HP', category: 'Roster', value: ROSTER.allrounder!.hp, min: 10, max: 400, step: 5 }),
      dmg: tunables.add({ label: 'Allrounder-Schaden', category: 'Roster', value: ROSTER.allrounder!.damage, min: 1, max: 120, step: 1 }),
      loot: ROSTER.allrounder!.lootValue,
    },
    racer: {
      speed: tunables.add({ label: 'Racer-Tempo', category: 'Roster', value: ROSTER.racer!.speed, min: 1, max: 24, step: 0.5 }),
      hp: tunables.add({ label: 'Racer-HP', category: 'Roster', value: ROSTER.racer!.hp, min: 10, max: 400, step: 5 }),
      dmg: tunables.add({ label: 'Racer-Schaden', category: 'Roster', value: ROSTER.racer!.damage, min: 1, max: 120, step: 1 }),
      loot: ROSTER.racer!.lootValue,
    },
    bunker: {
      speed: tunables.add({ label: 'Bunker-Tempo', category: 'Roster', value: ROSTER.bunker!.speed, min: 1, max: 20, step: 0.5 }),
      hp: tunables.add({ label: 'Bunker-HP', category: 'Roster', value: ROSTER.bunker!.hp, min: 20, max: 1200, step: 10 }),
      dmg: tunables.add({ label: 'Bunker-Schaden', category: 'Roster', value: ROSTER.bunker!.damage, min: 1, max: 200, step: 1 }),
      loot: ROSTER.bunker!.lootValue,
    },
  };
  const escHpGet = tunables.add({ label: 'Heat-HP ×/Stufe', category: 'Roster', value: DEFAULT_ESCALATION.hp, min: 1, max: 2.5, step: 0.05 });
  const escSpeedGet = tunables.add({ label: 'Heat-Tempo ×/Stufe', category: 'Roster', value: DEFAULT_ESCALATION.speed, min: 1, max: 2, step: 0.02 });
  const escDmgGet = tunables.add({ label: 'Heat-Schaden ×/Stufe', category: 'Roster', value: DEFAULT_ESCALATION.damage, min: 1, max: 2.5, step: 0.05 });
  const spawner = createSpawner(scene, TANK_RADIUS, () => aiRng.next(), {
    interval: swarmIntervalGet,
    radiusMin: 80, // Spawns weit draußen (außerhalb Gegner-Schussweite 28) → Reaktionszeit, nie direkt neben dem Spieler
    radiusMax: 150,
    maxLevel: 3,
    clumpSize: pulkGroesse, // Schwarm spawnt als Pulk auf einen Punkt (Garten); Rest einzeln
  });

  // Combatant des Spielers (Gegner-Combatants liefert der Roster dynamisch).
  const playerCombatant: Combatant = {
    id: 'player', team: 'player', x: 0, z: 0, radius: TANK_RADIUS, hp: tank.hp, maxHp: cls.maxHp,
    alive: true, lootValue: 1.0,
  };
  const liveCombatants = (): Combatant[] => [playerCombatant, ...roster.map((e) => e.combatant)];

  // Spieler-Werte: Klassen-Basis + akkumulierte Level-Boni (maxHp/Tempo/Dodge). Crit läuft separat
  // über mitCrit() auf den ausgeteilten Schaden; die Live-Regler (Buffs/Tempo-Mul) wirken zusätzlich.
  const playerBoni = createPlayerBoni(); // zweite Wachstums-Achse: Level-Up-Wahlkarten
  const playerStats = () => ({
    damage: cls.damage,
    maxHp: cls.maxHp + playerBoni.maxHp,
    speed: cls.speed * (1 + playerBoni.speed),
    armor: 0,
    dodge: playerBoni.dodge,
  });
  let playerSpeed = cls.speed; // Klassen-Basis × Buffs × Regler
  let playerSpeedMul = 1; // Live-Regler auf die eigene Fahrgeschwindigkeit
  const progression = createProgression(); // Level/XP/MK (P2)
  // Crit-Wurf auf den FINALEN Schaden (inkl. Aufbau-Bonus → multiplikativ mit dem Build, das ist die
  // gesuchte Synergie). critPending merkt den letzten Wurf, damit damageEnemyTick Crits rot färbt.
  let critPending = false, critTotal = 0, schussTotal = 0; // Crit-Statistik fürs snap-Log
  const mitCrit = (dmg: number): number => {
    const r = rollCrit(playerBoni, Math.random);
    critPending = r.crit;
    schussTotal += 1; if (r.crit) critTotal += 1;
    return Math.round(dmg * r.dmgMul);
  };

  // — Schicht 2: Kompass (Absicht) + Evolution (Fortschritt je Kanal) —
  const baseMode: BaseMode = combatStyle; // Grundmodus = gewählter Kampfstil
  const evo = createEvolutionState(baseMode);
  const compass = createCompassState();
  const evoMinFirst = 20, evoMinBetween = 25; // Mindestzeiten fürs Evolutions-Fenster (LOOP_TEST-Debug)
  // (Kompass-basierter Live-Kanal entfällt im fest-Build-Modus — alles lenkt ACTIVE_CORE in den
  // festen Kern. Kehrt mit dem späteren Multi-Build-Kompass zurück: emergingChannel(evo, compass.raw).)
  // — Impuls-Orbs: droppen beim Kill, fliegen automatisch zum Spieler, geben dort Fortschritt.
  // Farbe = Richtung beim Drop: blau = Kommandant/Kern, lila = Raum/AoE, grün = Zustand/DoT.
  const POLE_HEX = { kommandant: '#4dabf7', aoe: '#c77dff', dot: '#69db7c' };
  const channelHex = (ch: EvolutionChannelId): string => {
    const mid = ch.split('_')[1];
    return mid === 'aoe' ? POLE_HEX.aoe : mid === 'dot' ? POLE_HEX.dot : POLE_HEX.kommandant;
  };
  const orbs: { mesh: Mesh; channel: EvolutionChannelId; points: number }[] = [];
  const ORB_SPEED = 22; // Welt-Einheiten/s, mit dem der Orb zum Spieler fliegt
  const spawnImpulseOrb = (x: number, z: number, channel: EvolutionChannelId, points: number): void => {
    const orb = MeshBuilder.CreateSphere('orb', { diameter: 0.9, segments: 8 }, scene);
    orb.position.set(x, 1, z);
    orb.isPickable = false;
    const mat = new StandardMaterial('orb_mat', scene);
    mat.emissiveColor = Color3.FromHexString(channelHex(channel));
    mat.disableLighting = true;
    orb.material = mat;
    orbs.push({ mesh: orb, channel, points });
  };

  // — Sichtbarer Kompass: Dreieck mit ZIEHBAREM Punkt (oben Kern, unten-links Raum, -rechts Zustand) —
  const KERN = { x: 80, y: 20 }, RAUMP = { x: 24, y: 116 }, ZUSTP = { x: 136, y: 116 };
  const compassBox = document.createElement('div');
  compassBox.className = 'hud-br'; // UI-Scale: unten-rechts-Stapel mit frontHud; bottom mitskaliert
  compassBox.style.cssText = 'position:fixed;right:12px;bottom:calc(120px * var(--ui-scale));z-index:41;width:160px;height:140px;cursor:grab;touch-action:none;user-select:none;';
  compassBox.innerHTML =
    '<svg width="160" height="140" style="overflow:visible">' +
    `<polygon points="${KERN.x},${KERN.y} ${RAUMP.x},${RAUMP.y} ${ZUSTP.x},${ZUSTP.y}" fill="#10151cdd" stroke="#3a4a5a" stroke-width="1.5"/>` +
    `<text x="${KERN.x}" y="${KERN.y - 6}" fill="#4dabf7" font-size="11" font-family="system-ui" text-anchor="middle" font-weight="700">Befehl</text>` +
    `<text x="${RAUMP.x - 4}" y="${RAUMP.y + 15}" fill="#c77dff" font-size="11" font-family="system-ui" text-anchor="middle">Raum</text>` +
    `<text x="${ZUSTP.x + 4}" y="${ZUSTP.y + 15}" fill="#69db7c" font-size="11" font-family="system-ui" text-anchor="middle">Zustand</text>` +
    `<circle data-dot cx="${KERN.x}" cy="${KERN.y}" r="8" fill="#fff" stroke="#10151c" stroke-width="2"/>` +
    '</svg>';
  document.body.appendChild(compassBox);
  const compassDot = compassBox.querySelector('[data-dot]')!;
  const renderCompassDot = (): void => {
    const w = compass.raw;
    compassDot.setAttribute('cx', String(w.sniper * KERN.x + w.aoe * RAUMP.x + w.dot * ZUSTP.x));
    compassDot.setAttribute('cy', String(w.sniper * KERN.y + w.aoe * RAUMP.y + w.dot * ZUSTP.y));
  };
  const compassFromEvent = (ev: PointerEvent): void => {
    const r = compassBox.getBoundingClientRect();
    const s = r.width / 160 || 1; // CSS-UI-Scale herausrechnen (Box ist 160px breit · --ui-scale)
    const b = baryWeights({ x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s }, KERN, RAUMP, ZUSTP);
    compass.raw = { sniper: b.wa, aoe: b.wb, dot: b.wc };
    renderCompassDot();
  };
  let compassDragging = false;
  compassBox.addEventListener('pointerdown', (ev) => { compassDragging = true; compassFromEvent(ev); ev.preventDefault(); ev.stopPropagation(); });
  window.addEventListener('pointermove', (ev) => { if (compassDragging) compassFromEvent(ev); });
  window.addEventListener('pointerup', () => { compassDragging = false; });

  // Frontformung-HUD (unten rechts unter dem Kompass): entstehende Form + Stufe/Fortschritt.
  const frontHud = document.createElement('div');
  frontHud.className = 'hud-br'; // UI-Scale: unten-rechts-Stapel mit Kompass
  frontHud.style.cssText =
    'position:fixed;right:12px;bottom:calc(12px * var(--ui-scale));z-index:40;width:212px;background:#10151cdd;border:1px solid #2a3a4a;' +
    'border-radius:8px;padding:9px 11px;font:600 11px system-ui,sans-serif;color:#cfe3ee;pointer-events:none;';
  document.body.appendChild(frontHud);
  let frontHudCd = 0;
  const updateFrontHud = (): void => {
    const ch: EvolutionChannelId = ACTIVE_CORE;
    const stage = evo.unlockedStagesByChannel[ch];
    const thrNext = thresholdForStage(currentTuningProfile, stage + 1);
    const prevThr = stage >= 1 ? thresholdForStage(currentTuningProfile, stage) ?? 0 : 0;
    const prog = evo.progressByChannel[ch];
    const pct = thrNext != null ? Math.max(0, Math.min(1, (prog - prevThr) / (thrNext - prevThr))) : 1;
    const n = Math.round(pct * 10);
    const bar = '█'.repeat(n) + '░'.repeat(10 - n);
    const w = compass.raw;
    frontHud.innerHTML =
      '<div style="opacity:.55;letter-spacing:1px;font-size:10px">FRONTFORMUNG</div>' +
      `<div style="margin-top:3px;font-size:13px;color:#9be36b">${CHANNEL_DISPLAY[ch].displayName}</div>` +
      `<div style="margin-top:2px;opacity:.85">Stufe ${stage}/${maxStage(currentTuningProfile)}` +
      (thrNext != null ? ` &nbsp;${bar} ${Math.round(pct * 100)}%` : ' &nbsp;max') + '</div>' +
      `<div style="margin-top:5px;opacity:.65;font-size:10px">Befehl ${Math.round(w.sniper * 100)} · Raum ${Math.round(w.aoe * 100)} · Zustand ${Math.round(w.dot * 100)}</div>`;
    renderCompassDot();
  };

  // Run-Action-Log: pro Run nach logs/run-<NNN>.log (Schüsse, Bewegung, Shop …).
  const alog = createActionLog();
  alog.log('class', { id: cls.id });
  // Run-Diagnostik: sammelt Kennzahlen, loggt periodisch einen 'snap' (siehe Loop-Ende).
  const metrics = createRunMetrics();
  const snapIntervalGet = tunables.add({ label: 'Diagnose-Intervall s', category: 'Debug', value: 5, min: 1, max: 30, step: 1 });

  // SH2: Aktiv-Buffs (Debuffs auf Gegner) + Turm-Slew.
  const playerBuffs = createBuffStack();
  const buffHud = createBuffHud();
  let fireCd = 0; // Spieler-Feuer-Cooldown (Kühlmittel senkt ihn über fireRateMul)
  const PLAYER_FIRE_BASE = 0.28; // s zwischen Schüssen bei fireRate 1
  const GARTEN_FIRE_BASE = 0.14; // Garten: knapperer Takt — die 3 Dots sollen zügig sitzen (Munition limitiert, nicht die Rate)
  const BASE_TURRET_SLEW = 22; // rad/s Turm-Dreh-Tempo (Turmservo verdoppelt; Schüsse bleiben pixelgenau)
  let spawnGraceCd = 5; // 5s nach Erscheinen: unverwundbar (Spawn & Respawn)
  // — Schicht 0/1: Bauprofil (aus evolution/profiles) + Flow-State-Maschine —
  const currentTuningProfile: TuningProfile = 'LOOP_TEST'; // bis der Loop 5+ min stabil trägt
  const deathTimes: number[] = []; // Zeitstempel jüngster Tode (runClock) für Deathloop-Erkennung
  let lastRespawnAt = 0; // runClock des letzten Respawns (Respawn-Schonfrist)
  let flowState: FlowState = 'flow';
  let prevFlowState: FlowState = 'flow';
  let runOver = false; // Tod = Run vorbei (kein Respawn) → alles auf Anfang per Reload
  const fxList: { mesh: Mesh; mat: StandardMaterial; life: number; max: number; fade: boolean; alpha0: number }[] = []; // kurzlebige Effekt-Meshes (Laser, Rauch)

  // — Reaktive Schwarm-Welt (R1): Stil messen → Heat pro Richtung je Frontlage-Puls.
  // Heat bestimmt, welche Gegner-Typen + wie viele spawnen. Asymmetrischer Decay:
  // genutzte Richtung heizt schnell, ungenutzte kühlt langsam → mehrere Richtungen gleichzeitig.
  // Alle Heat-Zahlen sind Regler (Kategorie „Doktrin").
  const styleTracker = createStyleTracker();
  // Heat-Anstieg bewusst LANGSAM (Default), damit die Gegner-Eskalation erst spät kommt und der
  // Spieler Zeit hat, sich über den Kompass zu entwickeln. (Konstanten HEAT_* bleiben für Tests.)
  const heatStrongGet = tunables.add({ label: 'Heat +stark', category: 'Doktrin', value: 8, min: 1, max: 60, step: 1 });
  const heatMidGet = tunables.add({ label: 'Heat +mittel', category: 'Doktrin', value: 5, min: 1, max: 60, step: 1 });
  const heatLightGet = tunables.add({ label: 'Heat +leicht', category: 'Doktrin', value: 2, min: 0, max: 40, step: 1 });
  const decayGet = tunables.add({ label: 'Abkühlung/Puls', category: 'Doktrin', value: DECAY, min: 0, max: 40, step: 1 });
  const band1Get = tunables.add({ label: 'Stufe-1-Schwelle', category: 'Doktrin', value: BANDS[0]!, min: 5, max: 95, step: 1 });
  const band2Get = tunables.add({ label: 'Stufe-2-Schwelle', category: 'Doktrin', value: BANDS[1]!, min: 5, max: 99, step: 1 });
  const band3Get = tunables.add({ label: 'Stufe-3-Schwelle', category: 'Doktrin', value: BANDS[2]!, min: 5, max: 100, step: 1 });
  const director = createDoctrineDirector(DOCTRINES, {
    heatStrong: heatStrongGet, heatMid: heatMidGet, heatLight: heatLightGet,
    decay: decayGet, bands: () => [band1Get(), band2Get(), band3Get()],
  });
  // — Gegner-Verhalten (R2): jeder Typ bewegt sich nach seinem Muster. Tempo/Orbit/Vorhalt
  // als Live-Regler (Kategorie „Gegner") — die zentralen Playtest-Stellschrauben des Konters.
  const behaviorTuning = {
    closerSpeed: tunables.add({ label: 'Closer-Tempo', category: 'Gegner', value: 1.4, min: 0.5, max: 3, step: 0.1 }),
    flankerSpeed: tunables.add({ label: 'Flanker-Tempo', category: 'Gegner', value: 0.7, min: 0.5, max: 3, step: 0.1 }),
    swarmSpeed: tunables.add({ label: 'Swarm-Tempo', category: 'Gegner', value: 0.9, min: 0.5, max: 3, step: 0.1 }),
    disruptorSpeed: tunables.add({ label: 'Disruptor-Tempo', category: 'Gegner', value: 1.8, min: 0.5, max: 3, step: 0.1 }),
    blockerSpeed: tunables.add({ label: 'Blocker-Tempo', category: 'Gegner', value: 1.3, min: 0.5, max: 3, step: 0.1 }),
    racerSpeed: tunables.add({ label: 'Racer-Tempo', category: 'Gegner', value: 2.4, min: 0.5, max: 4, step: 0.1 }),
    flankerOrbit: tunables.add({ label: 'Flanker-Orbit', category: 'Gegner', value: 0.85, min: 0.3, max: 1.5, step: 0.05 }),
    blockerLead: tunables.add({ label: 'Blocker-Vorhalt', category: 'Gegner', value: 14, min: 0, max: 40, step: 1 }),
  };
  // Racer-eigener Schadensfaktor (auf den aus Ausrüstung/Level abgeleiteten Schuss-Schaden).
  const racerDmgMul = tunables.add({ label: 'Racer-Schaden ×', category: 'Gegner', value: 1, min: 0.2, max: 4, step: 0.1 });
  // Fix A: wie stark Gegner das Spielerziel vorhalten (0 = auf Ist-Position, 1 = volle Lead-Korrektur).
  const enemyLeadGet = tunables.add({ label: 'Vorhalt-Stärke', category: 'Gegner', value: 0.8, min: 0, max: 1.5, step: 0.05 });
  // — Gegner-Plan: Heat-Lage → Typ-MIX (welche Archetypen kontern deinen Stil). Die ZAHL ist
  // fest gedeckelt (Max Gegner), NICHT heat-getrieben → kein Dichte-Spiral, kein Schwarm.
  const swarmTuning = { base: maxEnemiesGet, perHeat: () => 0 };
  const typesById = new Map(DOCTRINES.map((d) => [d.id, d.enemyTypesByStufe]));
  const currentSwarmPlan = () => {
    const dirs: SwarmDirection[] = director.states().map((s) => ({
      id: s.id, heat: s.heat, stufe: s.stufe, typesByStufe: typesById.get(s.id) ?? [],
    }));
    const plan = planSwarm(dirs, swarmTuning);
    for (const t of DISABLED_TYPES) delete plan.weights[t]; // deaktivierte Typen nicht spawnen
    return plan;
  };
  let playerStationary = false; // für „Schaden im Stand" + Stil
  let prevPx = 0, prevPz = 0, prevPosInit = false; // echtes Spielertempo aus Positionsdelta
  let playerVelX = 0, playerVelZ = 0; // Spieler-Geschwindigkeit (blocker-Verhalten)
  let pulseLen = 14; // Frontlage-Puls (s): bewusst länger → Heat rampt langsam (Spieler-Entwicklung vorweg)
  let pulseCd = pulseLen;

  const combat = createCombatSystem(pool, liveCombatants, {
    damage: HIT_DAMAGE,
    projectileRadius: PROJECTILE_RADIUS,
    onHit: (h) => {
      // Stil messen: ausgeteilter Spielerschaden (manuell vs. Auto-Turret) / erlittener Schaden.
      if (h.projectile.team === 'player') {
        styleTracker.onDamageDealt({ amount: h.damage, fromAutoTurret: h.projectile.auto });
        metrics.onHitDealt(h.damage);
        if (combatStyle === 'dot' && !h.projectile.auto) {
          const e = roster.find((r) => r.id === h.target.id); // Gift setzen/erneuern (kein Initial: 1. Tick nach dotEvery)
          if (e) e.dot = { left: dotDur, tickCd: dotEvery };
        }
      } else if (h.target.id === 'player') {
        styleTracker.onDamageTaken({ amount: h.damage, stationary: playerStationary });
        metrics.onDamageTaken(h.damage, h.projectile.ownerType);
      }
      log.debug('hit', { target: h.target.id, hp: h.target.hp, lethal: h.lethal });
    },
    onDeath: (t, killerTeam) => {
      if (t.id === 'player') {
        killPlayer('schuss');
        return;
      }
      const e = roster.find((r) => r.id === t.id);
      if (e) killEnemy(e, killerTeam);
    },
  });

  // Gegner-Tod (von Projektil-Treffer ODER Tick-Schaden aus DoT/AoE): XP + entfernen.
  function killEnemy(e: Enemy, killerTeam: string): void {
    bus.emit('tank.died', { tankId: e.id });
    if (killerTeam === 'player') {
      metrics.onKill(e.typeId, runClock - (spawnTimes.get(e.id) ?? runClock));
      styleTracker.onKill({ dist: Math.hypot(e.combatant.x - playerCombatant.x, e.combatant.z - playerCombatant.z) });
      // Impuls-Orb in der aktuellen Kompass-Richtung droppen (nur im Flow → keine Deathloop-Punkte).
      // Garten: Kills droppen einen Impuls in den ZUSTAND (dot_core). Schwarm = Futter → KEIN Impuls
      // (sonst flutet der späte Schwarm den Aufbau); Rest gibt weniger als früher → Progress gestreckt.
      // Häscher geben NICHTS: kein Impuls-Orb, keine XP (reiner Druck, kein Futter fürs Build).
      if (!e.haescher) {
        if (flowState === 'flow' && e.typeId !== 'swarm') spawnImpulseOrb(e.combatant.x, e.combatant.z, ACTIVE_CORE, e.typeId === 'bunker' ? 8 : 4);
        const up = progression.addXp(Math.round(18 + (e.combatant.lootValue ?? 0.4) * 60));
        if (up.gained > 0) {
          if (up.newMkUnlocks.length) showToast(`MK${up.newMkUnlocks[up.newMkUnlocks.length - 1]} frei!`, '#9be36b');
          onLevelUp(up.gained); // pro gewonnenem Level eine Boni-Auswahl (Welt pausiert)
        }
      }
    }
    spawnTimes.delete(e.id);
    e.view.root.dispose();
    const idx = roster.indexOf(e);
    if (idx >= 0) roster.splice(idx, 1);
  }

  // Häscher-Spawn (aus dem Bewegungs-Heat): zäher grauer Vollstrecker, ON TOP zum normalen Spawn.
  // vorne=true → voraus in Fahrtrichtung (Fährte); sonst rings um den Spieler, näher (Kessel).
  const haescherType = ENEMY_TYPES['haescher']!;
  function spawnHaescher(cx: number, cz: number, vx: number, vz: number, vorne: boolean): Enemy {
    const speed = Math.hypot(vx, vz);
    let ang: number, r: number;
    if (vorne && speed > 1) {
      ang = Math.atan2(vz, vx) + (aiRng.next() - 0.5) * (Math.PI / 2); // ±45° um die Fahrtrichtung
      r = 70 + aiRng.next() * 50; // voraus, etwas weiter — man fährt hinein
    } else {
      ang = aiRng.next() * Math.PI * 2; // rundum
      r = 45 + aiRng.next() * 35; // näher — der Kessel schließt sich
    }
    const spec: EnemySpec = {
      id: 'h' + haescherSeq++,
      comp: haescherType.comp,
      spawn: { x: cx + Math.cos(ang) * r, z: cz + Math.sin(ang) * r },
      level: 1,
      displayName: 'Häscher',
      typeId: 'haescher',
      behavior: haescherType.behavior,
    };
    const e = createEnemyEntity(scene, spec, TANK_RADIUS, () => aiRng.next());
    const hs = haescherStats(Math.max(heatState.kessel, heatState.faehrte)); // zäher je heftiger der Exploit

    e.combatant.maxHp = hs.hp; e.combatant.hp = hs.hp;
    e.damage = hs.damage; e.speed = hs.speed;
    e.combatant.lootValue = 0; // keine XP
    e.haescher = true;
    tintHaescher(e);
    return e;
  }

  // Tick-Schaden (DoT/AoE) direkt auf HP, Rüstung ignoriert; tötet bei <=0.
  function damageEnemyTick(e: Enemy, dmg: number, kind: 'schuss' | 'gift' | 'sonst' = 'schuss'): void {
    if (!e.combatant.alive) return;
    e.untaetig = 0; // einen Treffer kassiert = relevant (Nachsetz-Timer zurück)
    e.combatant.hp -= dmg;
    if (!GIFT_BUILD && ultActive > 0 && befehlSkill.ult === 'seuche') ultSchaden += dmg; // Verfall-Ult: für den Lifesteal am Ende
    metrics.onHitDealt(dmg);
    const critHit = kind === 'schuss' && critPending; if (kind === 'schuss') critPending = false; // Crit-Flag pro Schuss konsumieren
    floatNums.spawn(e.combatant.x, e.combatant.z, dmg, kind === 'gift' ? '#9be36b' : kind === 'sonst' ? '#cdd6dd' : critHit ? '#ff4d4d' : '#ffe08a');
    if (e.combatant.hp <= 0) {
      e.combatant.hp = 0;
      e.combatant.alive = false;
      killEnemy(e, 'player');
    }
  }

  // Permanenter Schuss-Rekorder: friert pro Schuss alle Zahlen + Cursor ein.
  const recorder = createFireRecorder(scene, camera);
  let simTime = 0; // Sekunden seit Boot (Sim-Uhr), in der Loop akkumuliert
  let frame = 0;
  let shotSeq = 0;
  let snapCd = 0; // Diagnose-Snapshot-Takt (s); Default/Regler unten
  let runClock = 0; // Laufzeit-Uhr (Summe simDt) für Gegner-Lebensdauer
  const spawnTimes = new Map<string, number>(); // Gegner-ID → Spawn-Zeitpunkt (für Ø-Lebensdauer)
  // Idle-Erkennung: kein Fahren + kein manuelles Feuern + keine Zielbewegung = „Hände weg"
  // (Spieler tippt/will Analyse). idleFor wird in Snapshots + Tode gestempelt → Analyse ignoriert idle.
  let idleFor = 0, lastFireClock = -99;
  let prevAimX = 0, prevAimZ = 0, prevAimInit = false;

  // Feuern: Richtung im KLICK-Augenblick frisch aus dem aktuellen Cursor ableiten —
  // NICHT die (um einen Frame veraltete) Turm-Ausrichtung lesen. Sonst zielt der
  // Schuss aufs Ziel vom letzten Frame (bewiesen: aimErr 7-40° beim Bewegen).
  // Kern-Stufe → wie viele Ziele gleichzeitig markierbar sind (Stufe 0/1 = 1, Stufe 2 = 2, …).
  const maxMarks = (): number => Math.max(1, evo.unlockedStagesByChannel.sniper_core);
  // Auto-gesnappte Ziele als Salve auflösen: jedes Ziel garantiert treffen + Impuls je Treffer.
  function fireVolley(targets: string[]): void {
    const root = tank.view.root, turret = tank.view.turretNode;
    const origin = root.getAbsolutePosition();
    const dmg = Math.round(playerStats().damage * sniperDmgMul);
    const woundOn = evo.unlockedStagesByChannel.sniper_dot_aoe >= 1; // Auswahl-Wundbruch freigeschaltet
    const netOn = evo.unlockedStagesByChannel.sniper_aoe_dot >= 1; // Zielnetz freigeschaltet
    let hits = 0;
    for (const id of targets) {
      const e = roster.find((r) => r.id === id && r.combatant.alive);
      if (!e) continue;
      turret.rotation.y = yawTo(origin.x, origin.z, e.combatant.x, e.combatant.z) - root.rotation.y;
      spawnLaser(origin.x, origin.z, e.combatant.x, e.combatant.z);
      if (GIFT_BUILD) {
        // Stufenweise: St 0 = Grundschuss (direkter Treffer, Z noch nicht ausgebildet); ab St 1
        // INFIZIERT der Schuss (Gift säen) — töten tut dann nur das Gift. „Markieren" = anschießen.
        if (evo.unlockedStagesByChannel.dot_core < 1) damageEnemyTick(e, mitCrit(dmg));
        else {
          const fresh = !e.gift; // nur die ERSTE Infektion loggen, nicht jedes Nachsäen
          e.gift = saeGift(e.gift, gartenCfg);
          if (fresh) alog.log('dot', { id: e.id, src: 'schuss', typ: e.typeId, t: +runClock.toFixed(1) });
        }
        hits += 1; continue;
      }
      let hitDmg = dmg;
      // Wundbruch: wiederholte Wahl baut Wunddruck; Bonus = Druck; bei Schwelle bricht der Gegner
      // lokal auf (AoE um ihn herum) und der Druck wird zurückgesetzt.
      if (woundOn) {
        const p = woundPressure.get(id) ?? 0;
        hitDmg += Math.round(p);
        const np = p + woundStep;
        if (np >= woundCap) {
          for (const o of roster) {
            if (o === e || !o.combatant.alive) continue;
            if (Math.hypot(o.combatant.x - e.combatant.x, o.combatant.z - e.combatant.z) <= woundBurstR) damageEnemyTick(o, woundBurstDmg);
          }
          spawnBurstDisc(e.combatant.x, e.combatant.z, woundBurstR);
          woundPressure.delete(id);
          alog.log('wundbruch', { target: id });
        } else woundPressure.set(id, np);
      }
      damageEnemyTick(e, mitCrit(hitDmg)); // Kill droppt einen Impuls-Orb (siehe killEnemy)
      if (netOn && e.combatant.alive) netMarks.push({ id, left: netLinger }); // Zielnetz: Marke bleibt liegen
      hits += 1;
    }
    if (hits > 0) {
      metrics.onShot(); lastFireClock = runClock; bus.emit('tank.fired', { tankId: tank.id });
      alog.log('volley', { hits });
      fireCd = (ARENA_MODE ? GARTEN_FIRE_BASE : PLAYER_FIRE_BASE) / playerBuffs.aggregate().fireRateMul; // Cooldown nach der Salve
    }
  }

  // Ziel-Priorität evolviert dumm→schlau: Kern-Stufe 0 greift den Standard-Allrounder zuerst,
  // ab Stufe 1 die gefährlicheren schnellen Racer (Racer wichtiger als Bunker). Rang 0 = höchste Prio.
  const TARGET_ORDER_DUMB = ['allrounder', 'racer', 'bunker'];
  const TARGET_ORDER_SMART = ['racer', 'allrounder', 'bunker'];
  const targetRank = (typeId: string, stage: number): number => {
    const order = stage >= 1 ? TARGET_ORDER_SMART : TARGET_ORDER_DUMB;
    const i = order.indexOf(typeId);
    return i < 0 ? order.length : i; // unbekannter Typ = niedrigste Prio
  };
  // Auto-Targeting OHNE Cursor-Bezug: alle lebenden Gegner in Schuss-Reichweite (Welt-Distanz vom
  // Panzer) sind Kandidaten; davon die besten n nach Ziel-Priorität (Stufe), bei Gleichstand der
  // nähere zuerst. Liefert weniger als n, wenn nicht genug in Reichweite sind (→ kein Multishot bei
  // nur einem Ziel). Jeder Gegner nur einmal. Wird jeden Frame neu bestimmt (Gegner fahren rein/raus).
  function pickTargets(n: number, stage: number, px: number, pz: number, range: number): string[] {
    const cands: { id: string; rank: number; d: number }[] = [];
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const d = Math.hypot(e.combatant.x - px, e.combatant.z - pz);
      if (d > range) continue;
      cands.push({ id: e.id, rank: targetRank(e.typeId, stage), d });
    }
    cands.sort((a, b) => a.rank - b.rank || a.d - b.d);
    return cands.slice(0, Math.max(1, n)).map((c) => c.id);
  }

  // Befehl: ein Cursor-Ziel markieren (Order via befehl.ts) + Slow-Buff (verwundbar = Bonus beim Schuss).
  const markiereZiel = (id: string): boolean => {
    const e = roster.find((r) => r.id === id && r.combatant.alive);
    if (!e || !markiere(befehl, id)) return false; // tot, voll oder schon markiert
    e.buffs.add({ id: 'markiert', icon: '🎯', label: 'markiert', speedMul: MARK_SLOW, duration: MARK_BUFF_DUR });
    return true;
  };
  // Alle aktuellen Markierungen aufheben (Slow-Buff weg) — beim Bruch/Versagen verfallen sie sichtbar.
  const entmarkiereAlle = (): void => {
    for (const m of befehl.marks) roster.find((r) => r.id === m.id)?.buffs.remove('markiert');
  };
  const schiessLaser = (e: Enemy): void => {
    const root = tank.view.root, turret = tank.view.turretNode;
    const origin = root.getAbsolutePosition();
    turret.rotation.y = yawTo(origin.x, origin.z, e.combatant.x, e.combatant.z) - root.rotation.y;
    spawnLaser(origin.x, origin.z, e.combatant.x, e.combatant.z);
    metrics.onShot(); lastFireClock = runClock;
  };
  // Auto-Markierer (ab BB): markiert GENAU EIN nächstes freies Ziel in Sniper-Reichweite (das nächstgelegene),
  // mit fortlaufender Aufbau-Nummer (4·5·6…). Kein Ziel in Reichweite → nichts; der Loop wartet, bis eines reinfährt.
  const autoMarkEins = (sichtbar: ScreenBlip[]): void => {
    // NUR Gegner, die WIRKLICH IM BILD sind — sonst springt die Marke auf Ziele hinter/neben der Kamera, die
    // man nicht sieht (der Panzer sitzt nicht bildmittig). `sichtbar` ist schon tiefen-gefiltert (vor der
    // Kamera); hier zusätzlich gegen den Bildrand (sx/sy) prüfen. Davon den NÄCHSTEN zum Panzer in Reichweite.
    const w = engine.getRenderWidth(), h = engine.getRenderHeight();
    let best: string | null = null, bestD = sniperRange * sniperRange;
    for (const b of sichtbar) {
      if (b.sx < 0 || b.sx > w || b.sy < 0 || b.sy > h) continue; // seitlich/oben/unten außerhalb des Bildes
      const r = roster.find((x) => x.id === b.id);
      if (!r || !r.combatant.alive || befehl.marks.some((m) => m.id === b.id)) continue;
      const dx = r.combatant.x - playerCombatant.x, dz = r.combatant.z - playerCombatant.z;
      const d = dx * dx + dz * dz;
      if (d <= bestD) { bestD = d; best = b.id; }
    }
    if (best) markiereZiel(best);
  };
  // Kurzer grüner Vollbild-Flash, wenn der Verstärkungs-Buff (BB) bei +3 einrastet.
  const buffFlashEl = document.createElement('div');
  buffFlashEl.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;' +
    'background:radial-gradient(circle,rgba(155,227,107,0) 45%,rgba(155,227,107,0.4) 100%);transition:opacity 0.45s;';
  document.body.appendChild(buffFlashEl);
  const buffFlash = (): void => {
    buffFlashEl.style.transition = 'none'; buffFlashEl.style.opacity = '1';
    requestAnimationFrame(() => { buffFlashEl.style.transition = 'opacity 0.45s'; buffFlashEl.style.opacity = '0'; });
  };
  // Manueller Befehl-Schuss aufs Cursor-Ziel. B: jedes Markierte ok. BB/BBB: nur das aktuelle, Vorgriff
  // bricht die Kette. Schaden = Grundschuss + additiver Aufbau-Bonus (schadenStufe × BEFEHL_DMG_PRO_STUFE).
  const befehlSchuss = (id: string | null): void => {
    if (!id || fireCd > 0) return;
    const stufe = evo.unlockedStagesByChannel.sniper_core;
    const bbb = stufe >= 3; // BBB: Aufbau grenzenlos + permanent; BB: bei BB_CAP gedeckelt → Buff B
    const e = roster.find((r) => r.id === id && r.combatant.alive);
    if (!e) return;
    // Sperrfeuer-Ult: alles ist markiert (Flächen-Buff) → frei abknallen mit Markier-Schaden, kein Counter/Bruch, keine Munition.
    if (ultActive > 0 && befehlSkill.ult === 'streuung') {
      const bonus = Math.round(schadenStufe(befehl) * (1 + befehlSkill.ranks.beute * BEUTE_PRO_RANG)) * BEFEHL_DMG_PRO_STUFE; // Kriegsbeute-Talent
      schiessLaser(e); damageEnemyTick(e, mitCrit(Math.round(playerStats().damage * sniperDmgMul * MARK_VERWUNDBAR + bonus)));
      fireCd = BEFEHL_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
      return;
    }
    const art = trefferArt(befehl, id);
    alog.log('befehl', { art, ammo, m: befehl.marks.length, k: befehl.kette, b: befehl.buffStufe, st: stufe });
    if (art === 'fremd') {
      // BB+: ein Treffer auf ein UNMARKIERTES Ziel bei laufender Kette/Markierung bricht ebenfalls ab
      // (Disziplin — nicht nur der Vorgriff auf eine höhere Marke). Gehaltener Buff B bleibt.
      if (stufe >= 2 && (befehl.marks.length > 0 || befehl.kette > 0)) {
        if (schutzLadungen > 0) { schutzLadungen -= 1; showToast(`🛡 DISZIPLIN — ${schutzLadungen} Schutz übrig`, '#bfe3ff'); fireCd = BEFEHL_FIRE_BASE; return; } // Eiserne Disziplin fängt den Bruch ab
        entmarkiereAlle(); bruch(befehl); alog.log('befehl.bruch', { t: +runClock.toFixed(1), grund: 'fremd' });
        showToast('✗ FALSCHES ZIEL', '#ff6b6b');
        fireCd = BEFEHL_FIRE_BASE; return;
      }
      if (ammo <= 0) return; // ohne aktive Kette: unmarkiertes Ziel → normaler Schuss, kostet Munition
      schiessLaser(e); damageEnemyTick(e, mitCrit(Math.round(playerStats().damage * sniperDmgMul)));
      ammo = Math.max(0, ammo - 1);
      fireCd = BEFEHL_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
      return;
    }
    if (stufe >= 2 && art === 'vorgriff') { // BB+: höheres Ziel zuerst → Kette bricht (gehaltener Bonus bleibt)
      if (schutzLadungen > 0) { schutzLadungen -= 1; showToast(`🛡 DISZIPLIN — ${schutzLadungen} Schutz übrig`, '#bfe3ff'); fireCd = BEFEHL_FIRE_BASE; return; } // Eiserne Disziplin fängt den Bruch ab
      entmarkiereAlle(); bruch(befehl); alog.log('befehl.bruch', { t: +runClock.toFixed(1) });
      showToast('✗ REIHENFOLGE GEBROCHEN', '#ff6b6b');
      fireCd = BEFEHL_FIRE_BASE; return;
    }
    // Aufbau-Bonus: additiv je Schadens-Stufe (laufender Aufbau bzw. gehaltener Buff), Gift-Größenordnung.
    const bonus = stufe >= 2 ? Math.round(schadenStufe(befehl) * (1 + befehlSkill.ranks.beute * BEUTE_PRO_RANG)) * BEFEHL_DMG_PRO_STUFE : 0; // Kriegsbeute-Talent
    const dmg = mitCrit(Math.round(playerStats().damage * sniperDmgMul * MARK_VERWUNDBAR + bonus));
    schiessLaser(e); damageEnemyTick(e, dmg);
    if (!e.combatant.alive) {
      ammo = Math.min(AMMO_MAX, ammo + 1); // exekutiertes Ziel gibt die Markier-Munition zurück
      if (stufe >= 2) {
        if (registriereKill(befehl, id, bbb).capErreicht) { entmarkiereAlle(); buffFlash(); showToast(`🔥 VERSTÄRKUNG +${BB_CAP} · ${BUFF_TIME}s`, '#9be36b'); } // BB: Buff B eingerastet, Auto-Stop
        // sonst: der Auto-Markierer (Loop) zieht einzeln das nächste Ziel nach (4·5·6…)
      } else befehl.marks = befehl.marks.filter((m) => m.id !== id); // B: einfach entfernen
    }
    if (befehl.marks.length === 0) befehl.nextOrder = 1; // Salve leer (auch unvollständig) → Zeiger zurück
    fireCd = BEFEHL_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
  };
  // Verfall-Ult-Ende: alle infizierten/markierten Gegner explodieren (großer Schlag), der Spieler heilt
  // SEUCHE_LIFESTEAL des in der Ult-Phase ausgeteilten Schadens.
  const seucheEnde = (): void => {
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const infiziert = !!e.dot || e.buffs.active().some((b) => b.id === 'markiert');
      if (!infiziert) continue;
      const burst = Math.round(e.combatant.maxHp * 0.6 + schadenStufe(befehl) * BEFEHL_DMG_PRO_STUFE); // tödlicher Schlussschlag
      damageEnemyTick(e, burst, 'sonst');
    }
    const lifesteal = SEUCHE_LIFESTEAL + befehlSkill.ranks.pol * POL_ADERLASS_PRO_RANG; // Aderlass-Talent
    const heal = Math.round(ultSchaden * lifesteal);
    if (heal > 0) { playerCombatant.hp = Math.min(playerCombatant.maxHp, playerCombatant.hp + heal); showToast(`☣ VERFALL — +${heal} HP`, '#9be36b'); }
  };

  function fire(): void {
    // Befehl schießt auch im Fahrmodus; nur der Garten-Kommandant feuert ausschließlich im Scope.
    if (GIFT_BUILD && combatStyle === 'sniper' && !scopeActive) return;
    if (combatStyle === 'sniper') {
      if (fireCd > 0) return; // nach einem Schuss kurz nachladen
      if (!GIFT_BUILD) {
        // Befehl wächst von St0 (Grundschuss) zu St1 (B = Markieren) — Stufen schalten über sniper_core frei.
        if (evo.unlockedStagesByChannel.sniper_core < 1) {
          // St0 — Grundschuss: im Scope direkter Treffer aufs Cursor-Ziel, B noch nicht ausgebildet.
          if (scopeActive && ammo > 0 && sniperTargets.length) {
            const e0 = roster.find((r) => r.id === sniperTargets[0] && r.combatant.alive);
            if (e0) {
              schiessLaser(e0); damageEnemyTick(e0, mitCrit(Math.round(playerStats().damage * sniperDmgMul)));
              ammo = Math.max(0, ammo - 1);
              fireCd = BEFEHL_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
            }
          }
          return;
        }
        // St1+ (B): im Scope MARKIEREN (Munition pro Marke, nur bei offener Salve), Fahrmodus = SCHIESSEN.
        if (scopeActive) {
          if (ultActive > 0 && befehlSkill.ult === 'streuung') befehlSchuss(sniperTargets[0] ?? hoveredId); // Sperrfeuer: frei schießen statt markieren
          else if (salveOffen && ammo > 0 && befehl.marks.length < MAX_MARKS && sniperTargets.length && markiereZiel(sniperTargets[0]!)) {
            ammo = Math.max(0, ammo - 1);
            fireCd = BEFEHL_FIRE_BASE / playerBuffs.aggregate().fireRateMul;
            alog.log('mark', { m: befehl.marks.length, ammo });
          }
        } else {
          befehlSchuss(hoveredId);
        }
        return;
      }
      if (!sniperTargets.length) return; // Garten: kein Ziel in Reichweite
      if (ammo <= 0) return; // leer → erst auf R nachladen
      fireVolley(sniperTargets);
      ammo = Math.max(0, ammo - 1); // ein Infektions-Schuss verbraucht
      return;
    }
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
    // AoE: KEIN Projektil — die Bogenlampe legt am Cursor ein Schadensfeld ab (Wurfweite begrenzt).
    if (combatStyle === 'aoe') {
      if (g) {
        placeAoeField(g.x, g.z, origin.x, origin.z);
        metrics.onShot();
        lastFireClock = runClock;
        alog.log('aoe', { x: +g.x.toFixed(1), z: +g.z.toFixed(1) });
      }
      return;
    }
    let shotDamage = mitCrit(playerStats().damage);
    if (combatStyle === 'dot') shotDamage = 0; // DoT: kein Soforttreffer, nur Gift beim Treffer
    const p = pool.acquire({
      x: origin.x,
      y: 0.5,
      z: origin.z,
      dx,
      dz,
      speed: playerProjSpeed,
      life: shotRange / playerProjSpeed, // begrenzte Schussweite (im Scope = sniperRange)
      team: 'player',
      damage: shotDamage,
    });
    if (p) {
      bus.emit('tank.fired', { tankId: tank.id });
      bus.emit('projectile.spawned', { id: p.id });
      metrics.onShot();
      lastFireClock = runClock; // manuelles Feuern = aktiver Input (für Idle-Erkennung)
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

  // Raum: ein Feld am (auf Wurfweite geklemmten) Cursor-Punkt ablegen. Bleibt liegen, FIFO max 3 —
  // ein neues Feld schiebt das älteste weg (Logik + Disc synchron). Schaden/Slow/Zug macht die Loop.
  function placeAoeField(gx: number, gz: number, ox: number, oz: number): void {
    const ddx = gx - ox, ddz = gz - oz;
    const d = Math.hypot(ddx, ddz) || 1;
    const cx = d > aoeRange ? ox + (ddx / d) * aoeRange : gx;
    const cz = d > aoeRange ? oz + (ddz / d) * aoeRange : gz;
    const weg = legeFeld(raum, cx, cz, RAUM_CFG); // FIFO über maxFelder
    const disc = MeshBuilder.CreateCylinder('fx_aoe', { diameter: RAUM_CFG.radius * 2, height: 0.3, tessellation: 32 }, scene);
    disc.position.set(cx, 0.18, cz);
    disc.isPickable = false;
    const mat = new StandardMaterial('fx_aoe_mat', scene);
    mat.emissiveColor = new Color3(0.55, 0.2, 0.95); // Raum = violett
    mat.disableLighting = true;
    mat.alpha = 0.32;
    disc.material = mat;
    feldDiscs.push(disc);
    if (weg) feldDiscs.shift()?.dispose(); // älteste Disc weg, synchron zur FIFO-Verdrängung
  }

  // Gegner feuert auf sein Ziel — eigene Fraktion (team = Gegner-id) + Level-Schaden.
  function enemyFire(ox: number, oz: number, tx: number, tz: number, team: string, damage: number, ownerType = ''): void {
    const dx = tx - ox;
    const dz = tz - oz;
    const l = Math.hypot(dx, dz) || 1;
    const p = pool.acquire({
      x: ox, y: 0.5, z: oz, dx: dx / l, dz: dz / l,
      speed: PROJECTILE_SPEED, life: enemyShotRange / PROJECTILE_SPEED, team, damage, ownerType,
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

  /** Kurze verblassende Scheibe (Wundbruch-Aufbruch). */
  function spawnBurstDisc(x: number, z: number, r: number): void {
    const disc = MeshBuilder.CreateCylinder('fx_burst', { diameter: r * 2, height: 0.3, tessellation: 24 }, scene);
    disc.position.set(x, 0.16, z);
    disc.isPickable = false;
    const mat = new StandardMaterial('fx_burst_mat', scene);
    mat.emissiveColor = new Color3(1, 0.45, 0.2);
    mat.disableLighting = true;
    mat.alpha = 0.55;
    disc.material = mat;
    fxList.push({ mesh: disc, mat, life: 0.45, max: 0.45, fade: true, alpha0: 0.55 });
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

  const input = createInput(
    scene, camera, tank, () => playerSpeed, fire,
    () => BASE_TURRET_SLEW * playerBuffs.aggregate().turretSlewMul,
    () => !scopeActive || !GIFT_BUILD, // nur der Garten-Scope hält an; Befehl fährt im Scope weiter (nur Slomo)
    () => combatStyle !== 'sniper', // Sniper: kein Auto-Vorwärts, manuell per W/S fahren
  );

  // Sniper-Scope: Rechtsklick als SCHALTER (1× an, nochmal aus). Im Scope steht der Panzer,
  // die Maus snappt aufs Ziel (Fadenkreuz), der Schuss trifft garantiert.
  if (combatStyle === 'sniper') {
    // Sichtbarer Scope-Indikator — sonst rät man, ob der Schalter ankam (Debug: erst sichtbar machen).
    const badge = document.createElement('div');
    badge.textContent = '🔭 SCOPE';
    badge.className = 'hud-tc'; // UI-Scale: oben-zentriert (translateX(-50%) + scale via Klasse)
    badge.style.cssText =
      'position:fixed;top:calc(12px * var(--ui-scale));left:50%;z-index:50;background:#16240fee;' +
      'color:#9be36b;border:1px solid #9be36b;border-radius:6px;padding:4px 14px;display:none;' +
      'font:700 13px system-ui,sans-serif;letter-spacing:1.5px;pointer-events:none;';
    document.body.appendChild(badge);
    scopeBadge = badge; // im Loop für die Ziel-Prio-Anzeige genutzt
    // Fadenkreuz-Overlay: Ring + 4 Striche; Farbe signalisiert bereit (grün) / nachladen (orange).
    const ch = document.createElement('div');
    ch.className = 'hud-c'; // UI-Scale: cursor-gebunden, nur skalieren (margin zentriert bereits)
    ch.style.cssText = 'position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;z-index:45;display:none;pointer-events:none;';
    ch.innerHTML =
      '<div data-ring style="position:absolute;inset:0;border:2px solid #ff5252;border-radius:50%;box-shadow:0 0 6px #ff5252aa"></div>' +
      '<div data-tick style="position:absolute;left:50%;top:-7px;width:2px;height:9px;background:#ff5252;transform:translateX(-50%)"></div>' +
      '<div data-tick style="position:absolute;left:50%;bottom:-7px;width:2px;height:9px;background:#ff5252;transform:translateX(-50%)"></div>' +
      '<div data-tick style="position:absolute;top:50%;left:-7px;height:2px;width:9px;background:#ff5252;transform:translateY(-50%)"></div>' +
      '<div data-tick style="position:absolute;top:50%;right:-7px;height:2px;width:9px;background:#ff5252;transform:translateY(-50%)"></div>';
    document.body.appendChild(ch);
    sniperCrosshair = ch;
    // Marken-Pool: feste Ringe für bereits getaggte Ziele (Mehrfach-Markierung).
    markPool = Array.from({ length: 6 }, () => {
      const m = document.createElement('div');
      m.className = 'hud-c'; // UI-Scale: cursor-gebundene Marke, nur skalieren
      m.style.cssText =
        'position:fixed;width:30px;height:30px;margin:-15px 0 0 -15px;z-index:44;display:none;pointer-events:none;' +
        'border:2px solid #9be36b;border-radius:50%;box-shadow:0 0 6px #9be36baa;' +
        'color:#fff;font:800 15px system-ui;text-align:center;line-height:28px;text-shadow:0 1px 2px #000;';
      document.body.appendChild(m);
      return m;
    });
    const setScope = (on: boolean): void => {
      if (on && reloadCd > 0) return; // Nachladen ist die mobile Ausweich-Phase → kein Scope/Slomo währenddessen
      if (scopeActive === on) return;
      scopeActive = on;
      badge.style.display = on ? 'block' : 'none';
      if (on) {
        // Befehl: neue Markier-Salve startet nur, wenn alle alten Marken weg sind UND Munition voll
        // (sonst erst nachladen). Kein Sofort-Nachmarkieren, solange noch Marken aktiv sind.
        salveOffen = !GIFT_BUILD && befehl.marks.length === 0 && ammo >= AMMO_MAX;
      } else {
        // Scope aus → Salve abgeschlossen (Exekutionsphase); Ziel-Ringe weg; St3 „Rückkehrfenster".
        salveOffen = false;
        sniperTargets = [];
        ch.style.display = 'none'; for (const m of markPool) m.style.display = 'none';
        if (evo.unlockedStagesByChannel.sniper_core >= 3) returnBoostCd = 1.5;
      }
      log.info('scope', { on });
      if (!GIFT_BUILD) alog.log('scope', { on: on ? 1 : 0, m: befehl.marks.length, ammo, salve: salveOffen ? 1 : 0 });
    };
    // Rechtsklick HALTEN = Scope+Slomo (zielen/infizieren), loslassen = Fahrmodus (ausweichen).
    // POINTER-Events (nicht mouse-): Babylon preventDefault't den Pointer am Canvas und unterdrückt
    // damit die Legacy-mousedown-Events. Capture-Phase, damit der Canvas sie nicht vorher schluckt.
    window.addEventListener('contextmenu', (ev) => ev.preventDefault(), true);
    window.addEventListener('pointerdown', (ev) => { if (ev.button === 2) setScope(true); }, true);
    window.addEventListener('pointerup', (ev) => { if (ev.button === 2) setScope(false); }, true);
  }

  // Dash-Auslöser: Shift = kurzer Burst in Fahrtrichtung (der Panzer fährt eh vorwärts).
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Shift' || ev.repeat) return;
    if (dashCd > 0 || !playerCombatant.alive) return;
    const yaw = tank.view.root.rotation.y;
    dashDirX = Math.sin(yaw); // vorwärts entlang Heading
    dashDirZ = Math.cos(yaw);
    dashTimer = dashDur;
    dashCd = dashCdMax;
    alog.log('dash', {});
  });

  // Nachladen: R füllt die 3 Infektions-Schüsse wieder auf (CD; Tempo-Schub läuft solange = mobil).
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'r' && ev.key !== 'R') return;
    if (!ARENA_MODE || reloadCd > 0 || !playerCombatant.alive) return;
    if (ammo >= AMMO_MAX && slomoTime >= SLOMO_TIME) return; // schon randvoll
    reloadCd = RELOAD_TIME;
    if (!GIFT_BUILD) { entmarkiereAlle(); bruch(befehl); } // Nachladen verwirft die gesetzten Markierungen (+ laufende Kette; gehaltener Buff bleibt)
    alog.log('reload', { t: +runClock.toFixed(1) });
  });

  // Pol-Ult auslösen (Q): drücken → dauer s aktiv → cd s Cooldown. Nur wenn gewählt + bereit.
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'q' && ev.key !== 'Q') return;
    if (ultActive > 0 || ultCd > 0 || !playerCombatant.alive) return;
    if (!GIFT_BUILD) { // Befehl: eine der drei Pol-Ults
      if (!befehlSkill.ult) return;
      const u = befehlUltDef(befehlSkill.ult);
      ultActive = u.dauer + befehlSkill.ranks.dauer * DAUER_PRO_RANG; ultSchaden = 0; // Dauerbefehl-Talent
      alog.log('ult', { id: u.id, t: +runClock.toFixed(1) });
    } else {
      const u = activeUltDef(skill);
      if (!u) return;
      ultActive = u.dauer;
      alog.log('ult', { id: u.id, t: +runClock.toFixed(1) });
    }
  });

  // OS-Mauszeiger über dem Canvas ausblenden — das Spiel zeichnet sein eigenes
  // Fadenkreuz, das frame-synchron mit dem Turm läuft (kein Render-Weg-Versatz).
  canvas.style.cursor = 'none';
  const reticle = createReticle(scene);

  // HUD (Spieler/Gegner-HP) + Minimap (Named = roter Punkt = Wiedererkennung auf der Karte).
  const playerBar = createPlayerBar(scene, camera, engine); // HP+EP über dem eigenen Panzer
  const minimap = createMinimap(168, 150); // Reichweite 150 (Spawn-Ring reicht bis 130 — sonst fallen Gegner von der Karte)
  const enemyBars = createEnemyBars(scene, camera, engine); // HP-Balken über den Gegnern
  const floatNums = createFloatingNumbers(scene, camera, engine); // schwebende Schadenszahlen
  const swarmHud = createSwarmHud(); // Schwarm-Lage: Anzahl je Typ + Zieldichte
  const heatHud = ARENA_MODE ? null : createHeatHud(); // Garten: Heat-Lage ist interne Mechanik, NICHT angezeigt // Heat je Stil-Richtung (warum dieser Mix)
  // Spielernahe Namen der Richtungen (was den Heat treibt). Bunker entfernt (s. doctrineConfig).
  const STYLE_LABEL: Record<string, string> = {
    stoerkrieg: 'Auto-Turret', nebel: 'Distanz', sperrkrieg: 'Rush',
  };
  // — Regler-Registry (R0): jede live-stellbare Magic Number wird hier registriert und
  // erscheint automatisch im filterbaren Tuning-HUD. Spielcode liest die Live-Getter.
  const camApi = (window as unknown as { __cam?: { set(h: number, b: number, f?: number): void; setOffset(ox: number, oz: number): void; get(): { height: number; back: number; fov: number } } }).__cam;
  const cam0 = camApi?.get() ?? { height: 25, back: 55, fov: 0.87 };
  let camH = cam0.height, camB = cam0.back, camF = cam0.fov;
  const applyCam = (): void => camApi?.set(camH, camB, camF);
  // Garten: Fahr-Kamera weiter raus (Höhe 50 / Distanz 90), sonst fährt man blind in Gegner, die
  // schon auf 40 schießen. Scope bleibt mit 95/150 deutlich weiter (Survey). Per __cam-Panel feinjustierbar.
  if (ARENA_MODE) { camH = 50; camB = 90; applyCam(); }
  tunables.add({ label: 'Höhe', category: 'Kamera', value: camH, min: 8, max: 60, step: 1, onChange: (v) => { camH = v; applyCam(); } });
  tunables.add({ label: 'Distanz', category: 'Kamera', value: camB, min: 5, max: 80, step: 1, onChange: (v) => { camB = v; applyCam(); } });
  tunables.add({ label: 'Zoom (FOV)', category: 'Kamera', value: camF, min: 0.3, max: 1.0, step: 0.01, onChange: (v) => { camF = v; applyCam(); } });
  tunables.add({ label: 'Schussweite', category: 'Kampf', value: shotRange, min: 8, max: 120, step: 1, onChange: (v) => { shotRange = v; } });
  tunables.add({ label: 'Gegner-Reichweite', category: 'Kampf', value: enemyShotRange, min: 8, max: 120, step: 1, onChange: (v) => { enemyShotRange = v; } });
  tunables.add({ label: 'Spieler-Projektiltempo', category: 'Kampf', value: playerProjSpeed, min: 20, max: 120, step: 5, onChange: (v) => { playerProjSpeed = v; } });
  tunables.add({ label: 'Fahrgeschwindigkeit ×', category: 'Kampf', value: playerSpeedMul, min: 0.2, max: 4, step: 0.1, onChange: (v) => { playerSpeedMul = v; } });
  tunables.add({ label: 'Dash-Distanz', category: 'Fähigkeiten', value: dashDist, min: 4, max: 40, step: 1, onChange: (v) => { dashDist = v; } });
  tunables.add({ label: 'Dash-Cooldown s', category: 'Fähigkeiten', value: dashCdMax, min: 1, max: 15, step: 0.5, onChange: (v) => { dashCdMax = v; } });
  tunables.add({ label: 'Sniper-Reichweite', category: 'Stile', value: sniperRange, min: 40, max: 200, step: 5, onChange: (v) => { sniperRange = v; } });
  tunables.add({ label: 'Sniper-Schadensfaktor', category: 'Stile', value: sniperDmgMul, min: 1, max: 5, step: 0.5, onChange: (v) => { sniperDmgMul = v; } });
  // Zielnetz-Route
  tunables.add({ label: 'Netz-Restdauer s', category: 'Routen', value: netLinger, min: 1, max: 12, step: 0.5, onChange: (v) => { netLinger = v; } });
  tunables.add({ label: 'Netz-Schaden/Tick', category: 'Routen', value: netDmg, min: 1, max: 40, step: 1, onChange: (v) => { netDmg = v; } });
  tunables.add({ label: 'Netz-Streuradius', category: 'Routen', value: netSpreadR, min: 3, max: 30, step: 1, onChange: (v) => { netSpreadR = v; } });
  // Auswahl-Wundbruch-Route
  tunables.add({ label: 'Wunddruck/Treffer', category: 'Routen', value: woundStep, min: 2, max: 60, step: 2, onChange: (v) => { woundStep = v; } });
  tunables.add({ label: 'Wundbruch-Schwelle', category: 'Routen', value: woundCap, min: 20, max: 300, step: 10, onChange: (v) => { woundCap = v; } });
  tunables.add({ label: 'Wundbruch-AoE-Schaden', category: 'Routen', value: woundBurstDmg, min: 10, max: 250, step: 10, onChange: (v) => { woundBurstDmg = v; } });
  tunables.add({ label: 'Wundbruch-AoE-Radius', category: 'Routen', value: woundBurstR, min: 4, max: 40, step: 1, onChange: (v) => { woundBurstR = v; } });
  tunables.add({ label: 'Sniper-Kamera-Höhe', category: 'Stile', value: sniperCamHeight, min: 20, max: 200, step: 5, onChange: (v) => { sniperCamHeight = v; } });
  tunables.add({ label: 'Sniper-Kamera-Distanz', category: 'Stile', value: sniperCamBack, min: 20, max: 260, step: 5, onChange: (v) => { sniperCamBack = v; } });
  tunables.add({ label: 'AoE-Wurfweite', category: 'Stile', value: aoeRange, min: 8, max: 60, step: 1, onChange: (v) => { aoeRange = v; } });
  tunables.add({ label: 'Feld-Radius', category: 'Stile', value: RAUM_CFG.radius, min: 6, max: 40, step: 1, onChange: (v) => { RAUM_CFG.radius = v; } });
  tunables.add({ label: 'Feld-Zugkraft (RR)', category: 'Stile', value: RAUM_CFG.zugStaerke, min: 0, max: 120, step: 5, onChange: (v) => { RAUM_CFG.zugStaerke = v; } });
  tunables.add({ label: 'Nachsetz-Timeout (s)', category: 'Gegner', value: NACHSETZ_CFG.timeout, min: 2, max: 40, step: 1, onChange: (v) => { NACHSETZ_CFG.timeout = v; } });
  tunables.add({ label: 'Nachsetz-Distanz', category: 'Gegner', value: NACHSETZ_CFG.distMin, min: 20, max: 120, step: 5, onChange: (v) => { NACHSETZ_CFG.distMin = v; } });
  tunables.add({ label: 'DoT-Schaden/Tick', category: 'Stile', value: dotDmg, min: 1, max: 80, step: 1, onChange: (v) => { dotDmg = v; } });
  tunables.add({ label: 'Frontlage-Puls s', category: 'Doktrin', value: pulseLen, min: 2, max: 120, step: 2, onChange: (v) => { pulseLen = v; } });
  createTuningPanel(tunables, { onChange: (label, value) => alog.log('regler', { label, value }) });

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
  inspectPrompt.className = 'hud-bar'; // UI-Scale: projiziert über Gegner (translate(-50%,-100%) + scale via Klasse)
  inspectPrompt.style.cssText =
    'position:fixed;z-index:18;pointer-events:none;display:none;' +
    'font:700 11px system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;white-space:nowrap;';
  inspectPrompt.textContent = '[I] Inspizieren';
  document.body.appendChild(inspectPrompt);

  function openInspect(id: string): void {
    const e = roster.find((r) => r.id === id && r.combatant.alive);
    if (!e) return;
    const info = buildEnemyInfo({ ...e, speed: e.speed, activeBuffs: e.buffs.active().map((b) => b.label ?? b.id) });
    prevSimSpeed = clock.simSpeed;
    clock.simSpeed = 0; // Welt pausiert; beim Schließen wird prevSimSpeed wiederhergestellt
    inspecting = true;
    inspectCard.open(info, () => {
      clock.simSpeed = prevSimSpeed;
      inspecting = false;
    });
  }

  // Dash-HUD: einzelner Slot unten mittig — zeigt Bereitschaft bzw. CD-Countdown.
  const dashHud = document.createElement('div');
  dashHud.className = 'hud-bc'; // UI-Scale: unten-zentrierter Slot-Stapel (Dash/Ult)
  dashHud.style.cssText =
    'position:fixed;left:50%;bottom:calc(12px * var(--ui-scale));z-index:19;display:flex;gap:8px;pointer-events:none;';
  document.body.appendChild(dashHud);
  const dashSlotEl = document.createElement('div');
  dashSlotEl.style.cssText =
    'min-width:78px;text-align:center;background:rgba(8,12,16,0.78);border:1px solid #2a343b;' +
    'border-radius:7px;padding:5px 8px;font:600 10px system-ui,sans-serif;';
  dashHud.appendChild(dashSlotEl);
  // — ZZZ-Skill-UI: Ult-Icon-Slot (aktiv/CD), Skillpunkt-Hinweis und das pausierende Wähl-/Vergabe-Panel —
  const ultSlotEl = document.createElement('div');
  ultSlotEl.style.cssText =
    'min-width:92px;text-align:center;background:rgba(8,12,16,0.78);border:1px solid #2a343b;' +
    'border-radius:7px;padding:5px 8px;font:600 11px system-ui,sans-serif;display:none;';
  dashHud.appendChild(ultSlotEl);
  function updateUltHud(): void {
    const u = GIFT_BUILD ? activeUltDef(skill) : (befehlSkill.ult ? befehlUltDef(befehlSkill.ult) : null);
    if (!u) { ultSlotEl.style.display = 'none'; return; }
    ultSlotEl.style.display = 'block';
    if (ultActive > 0) { ultSlotEl.style.borderColor = '#69db7c'; ultSlotEl.innerHTML = `${u.icon} <b style="color:#9be36b">AKTIV ${ultActive.toFixed(1)}s</b>`; }
    else if (ultCd > 0) { ultSlotEl.style.borderColor = '#5a4a2a'; ultSlotEl.innerHTML = `${u.icon} <span style="color:#ffae5b">CD ${ultCd.toFixed(1)}s</span>`; }
    else { ultSlotEl.style.borderColor = '#2a343b'; ultSlotEl.innerHTML = `${u.icon} <span style="color:#cdd6dd">[${u.taste}]</span>`; }
  }
  const skillHint = document.createElement('div');
  skillHint.className = 'hud-tc'; // UI-Scale: oben-zentriert unter dem Scope-Badge
  skillHint.style.cssText =
    'position:fixed;left:50%;top:calc(54px * var(--ui-scale));z-index:20;pointer-events:none;display:none;' +
    'font:700 13px system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;';
  document.body.appendChild(skillHint);
  let skillOpen = false, skillPrevSpeed = 1;
  const skillPanel = document.createElement('div');
  skillPanel.className = 'hud-cc'; // UI-Scale: bildschirmmittiges Modal (translate(-50%,-50%) + scale via Klasse)
  skillPanel.style.cssText =
    'position:fixed;left:50%;top:50%;z-index:60;display:none;width:340px;' +
    'background:#0e141bf2;border:1px solid #33485c;border-radius:10px;padding:14px 16px;font:600 12px system-ui,sans-serif;color:#cfe3ee;';
  document.body.appendChild(skillPanel);
  const skillRow = (act: string, title: string, sub: string, dim: boolean): string =>
    `<div data-act="${act}" style="margin-top:5px;padding:6px 8px;border:1px solid ${dim ? '#243240' : '#3a5a72'};` +
    `border-radius:6px;cursor:${dim ? 'default' : 'pointer'};opacity:${dim ? 0.5 : 1}">` +
    `<div>${title}</div><div style="opacity:.65;font-size:10px;margin-top:1px">${sub}</div></div>`;
  function renderSkillPanel(): void {
    if (!GIFT_BUILD) { renderBefehlSkillPanel(); return; }
    let html = `<div style="font-size:14px;color:#9be36b">✦ Skillpunkte: ${skill.punkte}</div>`;
    if (!skill.ult) {
      html += `<div style="opacity:.7;margin:7px 0 1px">Wähle deine Pol-Ult (kostet 1 Punkt):</div>`;
      for (const u of ULTS) html += skillRow(`ult:${u.id}`, `${u.icon} ${u.name} · ${u.pol}`, `${u.text} (Taste ${u.taste}, ${u.dauer}s / CD ${u.cd}s)`, skill.punkte <= 0);
    } else {
      const u = activeUltDef(skill)!;
      html += `<div style="margin:7px 0 1px">Ult: <b>${u.icon} ${u.name}</b> · Taste [${u.taste}]</div>`;
      html += `<div style="opacity:.7;margin:5px 0 1px">Talente (Rang/${TALENT_MAX}):</div>`;
      for (const t of TALENTS) {
        const rk = skill.ranks[t.id]; const max = rk >= TALENT_MAX;
        html += skillRow(`tal:${t.id}`, `${t.name} &nbsp; ${'●'.repeat(rk)}${'○'.repeat(TALENT_MAX - rk)}`, t.text, skill.punkte <= 0 || max);
      }
    }
    html += `<div style="opacity:.5;margin-top:11px;font-size:10px">[T] / [Esc] schließen</div>`;
    skillPanel.innerHTML = html;
  }
  function renderBefehlSkillPanel(): void {
    let html = `<div style="font-size:14px;color:#9be36b">✦ Skillpunkte: ${befehlSkill.punkte}</div>`;
    if (!befehlSkill.ult) {
      html += `<div style="opacity:.7;margin:7px 0 1px">Wähle deine Pol-Ult (kostet 1 Punkt):</div>`;
      for (const u of BEFEHL_ULTS) html += skillRow(`ult:${u.id}`, `${u.icon} ${u.name} · ${u.pol}`, `${u.text} (Taste ${u.taste}, ${u.dauer}s / CD ${u.cd}s)`, befehlSkill.punkte <= 0);
    } else {
      const u = befehlUltDef(befehlSkill.ult);
      html += `<div style="margin:7px 0 1px">Ult: <b>${u.icon} ${u.name}</b> · Taste [${u.taste}]</div>`;
      html += `<div style="opacity:.7;margin:5px 0 1px">Talente (Rang/${BEFEHL_TALENT_MAX}):</div>`;
      for (const t of BEFEHL_TALENTS) {
        const rk = befehlSkill.ranks[t.id]; const max = rk >= BEFEHL_TALENT_MAX;
        let name = t.name, text = t.text;
        if (t.id === 'pol') { // Stufe 5 ist an die gewählte Ult gekoppelt
          if (befehlSkill.ult === 'kommando') { name = 'Übermacht'; text = '+1 gleichzeitiges Auto-Ziel je Rang'; }
          else if (befehlSkill.ult === 'seuche') { name = 'Aderlass'; text = '+1 % Verfall-Lifesteal je Rang'; }
          else if (befehlSkill.ult === 'streuung') { name = 'Klammergriff'; text = '+2 % Slow auf Markierte je Rang'; }
        }
        html += skillRow(`tal:${t.id}`, `${name} &nbsp; ${'●'.repeat(rk)}${'○'.repeat(BEFEHL_TALENT_MAX - rk)}`, text, befehlSkill.punkte <= 0 || max);
      }
    }
    html += `<div style="opacity:.5;margin-top:11px;font-size:10px">[T] / [Esc] schließen</div>`;
    skillPanel.innerHTML = html;
  }
  skillPanel.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!el) return;
    const act = el.getAttribute('data-act') ?? '';
    if (!GIFT_BUILD) {
      if (act.startsWith('ult:')) chooseBefehlUlt(befehlSkill, act.slice(4) as BefehlUltId);
      else if (act.startsWith('tal:')) { const id = act.slice(4) as BefehlTalentId; if (spendBefehlTalent(befehlSkill, id) && id === 'disziplin') schutzLadungen = befehlSkill.ranks.disziplin; }
      renderSkillPanel();
      return;
    }
    if (act.startsWith('ult:')) chooseUlt(skill, act.slice(4) as UltId);
    else if (act.startsWith('tal:')) spendTalent(skill, act.slice(4) as TalentId);
    recomputeSkills(); renderSkillPanel();
  });
  const openSkill = (): void => { skillOpen = true; skillPrevSpeed = clock.simSpeed; clock.simSpeed = 0; renderSkillPanel(); skillPanel.style.display = 'block'; };
  const closeSkill = (): void => { skillOpen = false; clock.simSpeed = skillPrevSpeed; skillPanel.style.display = 'none'; };
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 't' || ev.key === 'T') { if (skillOpen) closeSkill(); else openSkill(); }
    else if (ev.key === 'Escape' && skillOpen) closeSkill();
  });

  // — Level-Up-Boni: bei jedem Aufstieg pausiert die Welt und bietet 3 zufällige Karten (zweite
  //   Wachstums-Achse). Mehrere Level auf einmal (dicker Kill) werden als Queue nacheinander gewählt. —
  let levelUpQueue = 0, levelUpOpen = false, levelPrevSpeed = 1;
  let levelAuswahl: BoniId[] = [];
  const levelPanel = document.createElement('div');
  levelPanel.className = 'hud-cc'; // UI-Scale: bildschirmmittiges Modal (wie das Skill-Panel)
  levelPanel.style.cssText =
    'position:fixed;left:50%;top:50%;z-index:62;display:none;width:340px;' +
    'background:#0e141bf2;border:1px solid #4a6a33;border-radius:10px;padding:14px 16px;font:600 12px system-ui,sans-serif;color:#cfe3ee;';
  document.body.appendChild(levelPanel);
  function renderLevelPanel(): void {
    let html = `<div style="font-size:14px;color:#9be36b">⬆ Level ${progression.level} — wähle einen Bonus</div>`;
    if (levelUpQueue > 1) html += `<div style="opacity:.6;font-size:10px;margin-top:2px">noch ${levelUpQueue} Aufstiege offen</div>`;
    for (const id of levelAuswahl) {
      const d = boniDef(id); if (!d) continue;
      html += `<div data-boni="${id}" style="margin-top:6px;padding:8px 10px;border:1px solid #3a5a72;border-radius:6px;cursor:pointer">` +
        `<div style="font-size:13px">${d.icon} ${d.name}</div>` +
        `<div style="opacity:.7;font-size:10px;margin-top:1px">${d.text}</div></div>`;
    }
    levelPanel.innerHTML = html;
  }
  levelPanel.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest('[data-boni]') as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute('data-boni') as BoniId;
    const vorMax = playerStats().maxHp;
    waehleBoni(playerBoni, id);
    const nachMax = playerStats().maxHp;
    if (nachMax > vorMax) { playerCombatant.maxHp = nachMax; playerCombatant.hp += nachMax - vorMax; } // Max-HP-Zuwachs sofort gutschreiben
    levelUpQueue -= 1;
    if (levelUpQueue > 0) { levelAuswahl = randomBoniAuswahl(3); renderLevelPanel(); } // nächste Wahl der Queue
    else closeLevelUp();
  });
  function openLevelUp(): void {
    if (levelUpOpen || levelUpQueue <= 0) return;
    levelUpOpen = true; levelPrevSpeed = clock.simSpeed; clock.simSpeed = 0; // Welt pausieren
    levelAuswahl = randomBoniAuswahl(3);
    renderLevelPanel(); levelPanel.style.display = 'block';
  }
  function closeLevelUp(): void {
    levelUpOpen = false; clock.simSpeed = levelPrevSpeed; levelPanel.style.display = 'none';
  }
  function onLevelUp(gained: number): void {
    levelUpQueue += gained;
    openLevelUp();
  }
  function updateDashHud(): void {
    const ready = dashCd <= 0;
    dashSlotEl.style.borderColor = ready ? '#3c7d6e' : '#2a343b';
    dashSlotEl.innerHTML =
      `<div style="color:${ready ? '#7fd1c0' : '#7a8a86'};font-weight:800">⇄ Dash</div>` +
      (ready ? `<div style="color:#cdd6dd">Shift</div>` : `<div style="color:#ffae5b;font-weight:800">${dashCd.toFixed(1)}s</div>`);
  }
  updateDashHud();

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (k === 'm' && !inspecting) {
      overviewMap.toggle();
    } else if (k === 'i') {
      if (inspecting) inspectCard.close();
      else if (hoveredId) openInspect(hoveredId); // Gegner anvisiert → Inspect (pausiert)
    } else if (ev.key === 'Escape' && inspecting) {
      inspectCard.close();
    }
  });

  // Toast: kurze Einblendung (Level-Up etc.).
  const toast = document.createElement('div');
  toast.id = 'loot-toast';
  toast.className = 'hud-bc'; // UI-Scale: unten-zentriert über dem Munitions-HUD
  toast.style.cssText =
    'position:fixed;left:50%;bottom:calc(64px * var(--ui-scale));z-index:22;pointer-events:none;' +
    'font:700 16px system-ui,sans-serif;color:#ffe08a;background:rgba(8,10,12,0.72);' +
    'padding:8px 16px;border-radius:8px;opacity:0;transition:opacity 0.2s;text-shadow:0 1px 3px #000;';
  document.body.appendChild(toast);
  // Munitions-/Nachlade-Anzeige (Garten): Punkte = Schüsse, sonst Nachlade-Countdown.
  const ammoHud = document.createElement('div');
  ammoHud.id = 'ammo-hud';
  ammoHud.className = 'hud-bc'; // UI-Scale: unten-zentriert über Dash-Slot
  ammoHud.style.cssText =
    'position:fixed;left:50%;bottom:calc(40px * var(--ui-scale));z-index:20;pointer-events:none;' +
    'font:700 15px system-ui,sans-serif;color:#bfe3ff;text-shadow:0 1px 3px #000;letter-spacing:2px;';
  document.body.appendChild(ammoHud);
  // Befehl-Macht-Anzeige (BB+): A = laufender Schadens-Aufbau (gelb), B = gehaltener Buff (orange) —
  // bewusst zwei klar getrennte, farbcodierte Blöcke, damit sofort lesbar ist, was wofür steht.
  const befehlHud = document.createElement('div');
  befehlHud.id = 'befehl-hud';
  befehlHud.className = 'hud-bc'; // UI-Scale: unten-zentriert über dem Munitions-HUD
  befehlHud.style.cssText =
    'position:fixed;left:50%;bottom:calc(92px * var(--ui-scale));z-index:21;pointer-events:none;' +
    'font:800 17px system-ui,sans-serif;text-shadow:0 1px 4px #000;letter-spacing:0.5px;white-space:nowrap;display:none;';
  document.body.appendChild(befehlHud);
  function showToast(msg: string, color = '#ffe08a'): void {
    toast.textContent = msg;
    toast.style.color = color;
    toast.style.opacity = '1';
    setTimeout(() => (toast.style.opacity = '0'), 1600);
  }

  // Spieler-Respawn: bei 0 HP nicht „tot weiterballern", sondern neu aufbauen —
  // volle HP, an eine neue zufällige Position, mit kurzer Mercy-Unverwundbarkeit.
  // Tod = Run vorbei: kein Respawn, kompletter Reset auf Anfang (Reload → Stil-Auswahl).
  function killPlayer(cause: string): void {
    if (playerCombatant.invulnerable || runOver) return; // (alive-Check NICHT: combat setzt alive=false vor onDeath)
    playerCombatant.hp = 0;
    playerCombatant.alive = false;
    log.warn('player died', { cause });
    metrics.onDeath();
    alog.log('player.death', { cause, byType: metrics.lastDamager(), t: +runClock.toFixed(1) });
    bus.emit('tank.died', { tankId: 'player' });
    endRun(cause);
  }

  // „Gefallen"-Overlay; Neustart lädt die Seite neu = garantiert leckfreier Voll-Reset auf Anfang.
  function endRun(cause: string): void {
    runOver = true;
    alog.log('run.over', { cause, t: +runClock.toFixed(1), level: progression.level });
    const ov = document.createElement('div');
    ov.style.cssText =
      'position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'background:#06080cee;color:#e8e0c8;font-family:system-ui,sans-serif;text-align:center;';
    ov.innerHTML =
      '<div style="font-size:44px;font-weight:800;letter-spacing:4px;color:#ff6b6b">GEFALLEN</div>' +
      `<div style="margin-top:10px;opacity:.85;font-size:15px">Zeit überlebt: ${Math.round(runClock)}s · Level ${progression.level}</div>` +
      '<div style="margin-top:6px;opacity:.5;font-size:13px">tot heißt tot — alles auf Anfang</div>';
    const btn = document.createElement('button');
    btn.textContent = 'Neu starten';
    btn.style.cssText =
      'margin-top:24px;padding:11px 28px;font:700 15px system-ui;color:#06080c;background:#9be36b;border:none;border-radius:8px;cursor:pointer;';
    btn.onclick = () => window.location.reload();
    ov.appendChild(btn);
    document.body.appendChild(ov);
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') window.location.reload(); });
  }

  function respawnPlayer(): void {
    const ang = aiRng.next() * Math.PI * 2;
    const r = 50 + aiRng.next() * 30;
    tank.view.root.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    playerCombatant.x = tank.view.root.position.x;
    playerCombatant.z = tank.view.root.position.z;
    playerCombatant.hp = playerCombatant.maxHp;
    playerCombatant.alive = true;
    playerCombatant.invulnerable = true; // sofort (schützt auch im selben combat-Frame)
    lastRespawnAt = runClock;
    // Notstart-Hilfe: in der Todesspirale länger unverwundbar + nahe Gegner wegdrücken,
    // damit man nicht direkt wieder in den Tod respawnt (kein neuer Counter, nur Entlastung).
    const broken = flowState === 'broken';
    spawnGraceCd = broken ? 7 : 5;
    if (broken) {
      const relief = 28; // Radius, in dem Gegner beim Notstart weggeschoben werden
      for (const e of roster) {
        if (!e.combatant.alive) continue;
        const dx = e.combatant.x - playerCombatant.x, dz = e.combatant.z - playerCombatant.z;
        const d = Math.hypot(dx, dz);
        if (d < relief) {
          const ux = d > 0.01 ? dx / d : 1, uz = d > 0.01 ? dz / d : 0;
          e.view.root.position.x = playerCombatant.x + ux * relief;
          e.view.root.position.z = playerCombatant.z + uz * relief;
          e.combatant.x = e.view.root.position.x;
          e.combatant.z = e.view.root.position.z;
        }
      }
    }
    prevPosInit = false; // Teleport NICHT als Tempo werten (kein falsches Rush-Signal/Ø-Tempo-Spike)
    alog.log('player.respawn', { x: +playerCombatant.x.toFixed(1), z: +playerCombatant.z.toFixed(1), broken });
    showToast(broken ? 'Notstart — Druck entschärft' : 'Zerstört — neu aufgebaut');
  }

  // Mess-Overlay (Phase 1 Debugging): macht Cursor-Bodenpunkt, Ziel und Schussrichtung sichtbar.
  const aimDebug = createAimDebug(scene, camera, tank, () => input.getAimTarget());

  // Debug-Hooks für deterministische Verifikation.
  (window as unknown as { __dbg: unknown }).__dbg = {
    player: playerCombatant,
    enemies: roster.map((e) => e.combatant),
    roster: () =>
      roster.map((e) => ({
        id: e.id, level: e.level, behavior: e.behavior,
        hp: e.combatant.hp, alive: e.combatant.alive,
        loot: e.combatant.lootValue, team: e.combatant.team,
        x: +e.combatant.x.toFixed(1), z: +e.combatant.z.toFixed(1),
      })),
    // Reaktive Doktrin: Zustand lesen + (Test) einen Puls mit synthetischem Stil einspeisen.
    doctrines: () => ({ pulseCd: +pulseCd.toFixed(1), pulseLen, states: director.states() }),
    feedPulse: (partial: Partial<PlayerStyleProfile>) => {
      director.evaluate({ ...emptyProfile(), ...partial });
      return director.states();
    },
    swarm: () => currentSwarmPlan(),
    stats: () => playerStats(),
    // Verifikations-Sonden (Observability): Gegner-Kampfwerte lesen (rein level-basiert).
    enemyCombat: (id: string) => {
      const e = roster.find((r) => r.id === id);
      if (!e) return null;
      return {
        level: e.level,
        mk: enemyMk(e.level),
        hp: Math.round(e.combatant.hp),
        maxHp: Math.round(e.combatant.maxHp),
        armor: Math.round(e.combatant.armor ?? 0),
        dodge: e.combatant.dodge ?? 0,
        incomingMul: e.combatant.incomingMul ?? 1, // >1 = markiert/verwundbar
        damage: e.damage, // aus dem Level abgeleitet
      };
    },
    fxNow: () => fxList.map((f) => ({
      name: f.mesh.name, alpha: f.mat ? +f.mat.alpha.toFixed(2) : null,
      visible: f.mesh.isVisible, enabled: f.mesh.isEnabled(),
      x: +f.mesh.position.x.toFixed(1), z: +f.mesh.position.z.toFixed(1), life: +f.life.toFixed(1),
    })),
    playerInvuln: () => playerCombatant.invulnerable === true,
    flow: () => flowState,
    profile: () => currentTuningProfile,
    inspect: () => ({ open: inspecting, simSpeed: clock.simSpeed, hovered: hoveredId }),
    logTail: (n?: number) => alog.tail(n),
    runId: () => alog.runId(),
    buffs: () => playerBuffs.active(),
    buffMods: () => playerBuffs.aggregate(),
    playerSpeedNow: () => playerSpeed,
    mapOpen: () => overviewMap.isOpen(),
    openInspect: (id: string) => { openInspect(id); return { open: inspecting, simSpeed: clock.simSpeed }; },
    enemyInfoOf: (id: string) => {
      const e = roster.find((r) => r.id === id);
      return e ? buildEnemyInfo({ ...e, speed: e.speed, activeBuffs: e.buffs.active().map((b) => b.label ?? b.id) }) : null;
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
    progression: () => ({
      level: progression.level, xp: progression.xp,
      xpToNext: progression.xpToNext(), mk: progression.unlockedMk(),
    }),
    addXp: (n: number) => progression.addXp(n),
    rosterFull: () =>
      roster.map((e) => ({ name: e.displayName, alive: e.combatant.alive, level: e.level })),
  };

  // §21.5-Sichtbarkeitszähler periodisch loggen (aktiv == sichtbar)

  // GENAU EIN Loop. Reihenfolge: Steuerung -> Pool-Logik -> Boden-Recenter -> Mesh-Sync.
  startLoop(engine, scene, clock, (simDt) => {
    if (runOver) return; // Tod = Run vorbei → Updates einfrieren (Overlay läuft, Reload startet neu)
    const realDt = simDt; // ungebremste Zeit — für Feuertakt, Nachladen und die Slomo-Entscheidung
    // SLOMO: im Scope kriecht die WELT (Bullet-Time), Feuertakt bleibt real → 3 Dots zügig setzen.
    // Begrenzt durch ein ZEIT-Budget (sonst klebt man ewig im Slomo, indem man den letzten Schuss hält).
    // Endet, sobald Munition ODER Slomo-Zeit leer ist — was zuerst kommt.
    const seucheSlomo = !GIFT_BUILD && ultActive > 0 && befehlSkill.ult === 'seuche'; // Verfall-Ult: Dauer-Slomo, kein Budget-Verbrauch
    const slomoOn = (ARENA_MODE && scopeActive && ammo > 0 && slomoTime > 0) || seucheSlomo;
    if (slomoOn) { simDt = realDt * SLOMO_SCALE; if (!seucheSlomo) slomoTime = Math.max(0, slomoTime - realDt); }
    else if (ARENA_MODE && !scopeActive && slomoTime < SLOMO_TIME) slomoTime = Math.min(SLOMO_TIME, slomoTime + realDt * SLOMO_REGEN); // außerhalb des Scopes regeneriert das Budget
    // Nachladen (R) läuft in Echtzeit + Tempo-Schub (mobile Ausweich-Phase); füllt Munition UND Slomo-Zeit.
    if (reloadCd > 0) { reloadCd -= realDt; if (reloadCd <= 0) { ammo = AMMO_MAX; slomoTime = SLOMO_TIME; if (!GIFT_BUILD && befehl.marks.length === 0) salveOffen = true; } } // nach dem Nachladen wieder markierbar (Salve offen)
    // Ult-Timer (Echtzeit): aktiv runter → bei 0 in den Cooldown; danach Cooldown runter.
    if (ultActive > 0) {
      ultActive -= realDt;
      if (ultActive <= 0) {
        if (!GIFT_BUILD) { ultCd = Math.max(2, befehlUltDef(befehlSkill.ult).cd - befehlSkill.ranks.cooldown * CD_PRO_RANG); if (befehlSkill.ult === 'seuche') seucheEnde(); } // Schneller Stab kürzt CD; Verfall zündet
        else { const u = activeUltDef(skill); ultCd = u ? u.cd : 0; }
      }
    }
    else if (ultCd > 0) ultCd -= realDt;
    simTime += simDt;
    // SH2: Buffs altern, effektive Spieler-Stats (Tempo/Rüstung) = Loadout × Buffs.
    fireCd -= realDt;
    playerBuffs.tick(simDt);
    const pmods = playerBuffs.aggregate();
    const pst = playerStats();
    // Kern-Stufe 3 „Rückkehrfenster": kurzer Tempo-Schub direkt nach dem Auspacken.
    if (returnBoostCd > 0) returnBoostCd = Math.max(0, returnBoostCd - simDt);
    const returnBoost = returnBoostCd > 0 ? 1.5 : 1;
    // Befehl-Kaskade (ab BB): jeder in-Reihe-Kill staffelt das Tempo (aus befehl.kette), gedeckelt.
    const kaskade = !GIFT_BUILD && evo.unlockedStagesByChannel.sniper_core >= 2
      ? 1 + Math.min(KASKADE_SPEED_MAX, befehl.kette * KASKADE_SPEED_PRO_KETTE) : 1;
    playerSpeed = pst.speed * pmods.speedMul * playerSpeedMul * returnBoost * kaskade * (reloadCd > 0 ? RELOAD_SPEED : 1);
    playerCombatant.armor = pst.armor + pmods.armorAdd;
    playerCombatant.dodge = pst.dodge + pmods.dodgeAdd; // Ausweichen aus Buffs (Basis 0)
    playerCombatant.incomingMul = pmods.incomingMul; // Verwundbarkeit (falls Gegner später markieren)
    buffHud.update(playerBuffs.active());
    input.update(simDt);
    // Dash: kurzer Positions-Burst zusätzlich zur normalen Bewegung; CD läuft sichtbar runter.
    dashCd = Math.max(0, dashCd - simDt);
    if (dashTimer > 0 && simDt > 0) {
      const step = (dashDist / dashDur) * simDt;
      tank.view.root.position.x += dashDirX * step;
      tank.view.root.position.z += dashDirZ * step;
      dashTimer -= simDt;
    }
    updateDashHud();
    // Im Sniper-Scope kein Boden-Reticle (Cursor-Punkt) — dort zählt nur das Ziel-Fadenkreuz.
    reticle.update(combatStyle === 'sniper' && scopeActive ? null : input.getAimTarget());
    pool.update(simDt);
    updateFx(simDt); // Laser/Rauch-Effekte altern lassen

    const px = tank.view.root.position.x;
    const pz = tank.view.root.position.z;

    // Schicht 0: Flow-State pro Frame. BROKEN (Todesspirale) = Notstart: Spawns pausiert,
    // kein Heat-Anstieg. Tode altern aus dem Fenster → Zustand kehrt von selbst zu flow zurück.
    if (deathTimes.length) { const kept = pruneDeathTimes(deathTimes, runClock); if (kept.length !== deathTimes.length) deathTimes.splice(0, deathTimes.length, ...kept); }
    flowState = computeFlowState({ alive: playerCombatant.alive, now: runClock, lastRespawnAt, deathTimes });
    if (flowState !== prevFlowState) { alog.log('flow', { from: prevFlowState, to: flowState, t: +runClock.toFixed(1) }); prevFlowState = flowState; }

    // Schicht 2: vorgemerkte Evolution im sicheren Fenster freischalten. Im GARTEN levelt sie den
    // ZUSTAND (dot_core) — egal was der Kompass zeigt (alle Impulse fließen dorthin, siehe Orb-Drop).
    {
      const evoUnlock = tryTriggerEvolution(evo, {
        now: runClock, flow: flowState,
        minSecondsBeforeFirst: evoMinFirst, minSecondsBetween: evoMinBetween,
        dominantChannel: ACTIVE_CORE,
      });
      if (evoUnlock) {
        showToast(GIFT_BUILD && evoUnlock.channelId === 'dot_core'
          ? `🦠 STUFE ${evoUnlock.stage} · ${BUILD_STUFE_NAME[Math.min(evoUnlock.stage, BUILD_STUFE_NAME.length - 1)]}`
          : `STUFE ${evoUnlock.stage} · ${CHANNEL_DISPLAY[evoUnlock.channelId].displayName}`);
        alog.log('evolution', { ch: evoUnlock.channelId, stage: evoUnlock.stage, t: +runClock.toFixed(1) });
      }
    }
    frontHudCd -= simDt;
    if (frontHudCd <= 0) { frontHudCd = 0.1; updateFrontHud(); }

    // Impuls-Orbs fliegen zum Spieler (kein Hinfahren nötig) und geben beim Einsammeln Fortschritt
    // in ihrer Drop-Richtung (Farbe). Schnell genug, um den fahrenden Spieler einzuholen.
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]!;
      const dx = px - o.mesh.position.x, dz = pz - o.mesh.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 1.8) {
        gainProgress(evo, o.channel, o.points, currentTuningProfile);
        // 3. Build-Stufe erreicht (Garten ZZZ / Befehl BBB) → Impuls-Überschuss wird zu Skillpunkten.
        const stufe3 = GIFT_BUILD ? evo.unlockedStagesByChannel.dot_core >= 3 : evo.unlockedStagesByChannel.sniper_core >= 3;
        if (stufe3) {
          skillProgress += o.points;
          while (skillProgress >= PUNKT_KOSTEN) { skillProgress -= PUNKT_KOSTEN; (GIFT_BUILD ? skill : befehlSkill).punkte += 1; showToast('✦ Skillpunkt frei — [T]'); }
        }
        o.mesh.dispose(); orbs.splice(i, 1); continue;
      }
      const step = Math.min(d, ORB_SPEED * simDt);
      o.mesh.position.x += (dx / d) * step;
      o.mesh.position.z += (dz / d) * step;
      o.mesh.position.y = 1 + Math.sin(runClock * 6 + i) * 0.12;
    }

    // Stil messen + Frontlage-Puls (P3). Echtes Tempo aus dem Positionsdelta.
    if (!prevPosInit) { prevPx = px; prevPz = pz; prevPosInit = true; }
    const actualSpeed = simDt > 0 ? Math.hypot(px - prevPx, pz - prevPz) / simDt : 0;
    if (simDt > 0) { playerVelX = (px - prevPx) / simDt; playerVelZ = (pz - prevPz) / simDt; }
    heatState = updateHeat(heatState, playerVelX, playerVelZ, realDt, DEFAULT_HEAT_CFG); // intern: Steh-(Kessel)/Einseitig-(Fährte)Druck
    prevPx = px; prevPz = pz;
    playerStationary = actualSpeed < STATIONARY_SPEED;
    if (simDt > 0) styleTracker.onMove({ speed: actualSpeed, x: px, z: pz, dt: simDt });
    pulseCd -= simDt;
    if (pulseCd <= 0) {
      // BROKEN: kein Heat-Anstieg — leeres Profil (nur Decay), Tracker dennoch leeren (kein Stau).
      const snap = styleTracker.snapshotAndReset();
      director.evaluate(flowState === 'broken' ? emptyProfile() : snap);
      pulseCd = pulseLen;
    }

    // Stil-getriebener Nachschub (gedeckelt): Typ-Mix aus der Heat-Lage, Zahl fest (Max Gegner).
    runClock += simDt;
    const aliveCount = roster.reduce((n, e) => n + (e.combatant.alive ? 1 : 0), 0);
    // BROKEN: keine neuen Spawns (Druck raus, Loop erholt sich). Sonst normaler gedeckelter Nachschub.
    const welle = ARENA_MODE ? gegnerWelle(runClock) : null; // Garten: Timer+Batch-Eskalation (kein Auffüllen)
    if (welle && welle.level > prevWelleLevel) {
      // Stärke-Level gestiegen → ALLE lebenden Board-Gegner auf die neue Stufe heben (HP-Anteil bleibt, kein Heilen).
      for (const e of roster) {
        if (!e.combatant.alive || e.haescher) continue;
        const ts = gartenTypStats(e.typeId, welle.level);
        if (ts.hp <= e.combatant.maxHp) continue; // nur hochskalieren
        const frac = e.combatant.hp / e.combatant.maxHp;
        e.combatant.maxHp = ts.hp; e.combatant.hp = Math.max(1, Math.round(ts.hp * frac));
        e.damage = ts.damage; e.speed = ts.speed;
      }
      prevWelleLevel = welle.level;
    }
    const spawnPlan = welle
      ? { targetCount: welle.cap, weights: welle.weights, interval: welle.interval, batch: welle.batch }
      : currentSwarmPlan();
    const spawnedList = flowState === 'broken' ? [] : spawner.update(simDt, px, pz, aliveCount, spawnPlan);
    for (const spawned of spawnedList) {
      if (welle) {
        // Garten: Stats pro Typ × Wellen-Level (Charakter steckt im Typ, Level skaliert) — ersetzt die
        // flache Heat-Logik. Schwarm fragil, Brocken zäh, Läufer schnell, Allrounder Mitte.
        const ts = gartenTypStats(spawned.typeId, welle.level);
        spawned.combatant.maxHp = ts.hp; spawned.combatant.hp = ts.hp;
        spawned.damage = ts.damage; spawned.speed = ts.speed;
      } else {
        // Stats aus dem Roster × aktueller Distanz-Heat-Stufe setzen (überschreibt die Level-Defaults).
        const r = rosterGet[spawned.typeId];
        if (r) {
          const stufe = director.states().find((s) => s.id === 'nebel')?.stufe ?? 0;
          const s = scaleStats(
            { speed: r.speed(), hp: r.hp(), damage: r.dmg(), lootValue: r.loot },
            stufe,
            { hp: escHpGet(), speed: escSpeedGet(), damage: escDmgGet() },
          );
          spawned.combatant.maxHp = s.hp; spawned.combatant.hp = s.hp;
          spawned.damage = s.damage; spawned.speed = s.speed; spawned.combatant.lootValue = s.lootValue;
        }
      }
      roster.push(spawned); metrics.onSpawn(spawned.typeId); spawnTimes.set(spawned.id, runClock);
    }

    // Häscher-Nachschub (ON TOP, aus dem Bewegungs-Heat): getaktet auf die Soll-Zahl auffüllen.
    const hSoll = haescherSoll(runClock, heatState.kessel, heatState.faehrte);
    const hAlive = roster.reduce((n, e) => n + (e.combatant.alive && e.haescher ? 1 : 0), 0);
    haescherCd -= simDt;
    if (flowState !== 'broken' && hAlive < hSoll.front + hSoll.ring && haescherCd <= 0) {
      haescherCd = HAESCHER_SPAWN_CD;
      const vorne = hSoll.front > 0 && heatState.faehrte >= heatState.kessel; // Fährte dominiert → voraus
      const h = spawnHaescher(px, pz, playerVelX, playerVelZ, vorne);
      roster.push(h); spawnTimes.set(h.id, runClock);
    }

    // Idle-Erkennung: aktiver Input = Fahren ODER kürzlich manuell gefeuert ODER Ziel bewegt.
    const aimT = input.getAimTarget();
    const aimMoved = prevAimInit && aimT != null ? Math.hypot(aimT.x - prevAimX, aimT.z - prevAimZ) > 0.5 : aimT != null;
    if (aimT) { prevAimX = aimT.x; prevAimZ = aimT.z; prevAimInit = true; }
    const activeInput = actualSpeed > 0.3 || (runClock - lastFireClock) < 0.4 || aimMoved;
    idleFor = activeInput ? 0 : idleFor + simDt;

    // Run-Diagnostik: pro Frame messen, periodisch einen kompakten 'snap' loggen.
    metrics.frame(simDt, actualSpeed, aliveCount);
    snapCd -= simDt;
    if (snapCd <= 0) {
      snapCd = snapIntervalGet();
      const plan = currentSwarmPlan();
      const aliveByType: Record<string, number> = {};
      for (const e of roster) if (e.combatant.alive) aliveByType[e.typeId] = (aliveByType[e.typeId] ?? 0) + 1;
      const heat: Record<string, number> = {};
      for (const s of director.states()) heat[STYLE_LABEL[s.id] ?? s.id] = Math.round(s.heat);
      const snap = metrics.takeSnapshot({
        alive: aliveCount, target: plan.targetCount,
        hp: playerCombatant.hp, hpMax: playerCombatant.maxHp,
        level: progression.level, mk: progression.unlockedMk(),
        px, pz, heat, mix: aliveByType,
      });
      // Gegner-Lage relativ zum Spieler (macht Davonfahr-/Steh-Exploits sichtbar: back≫front bzw. inRange>0 ohne dpsIn).
      const rel = enemyRelative(
        px, pz, playerVelX, playerVelZ,
        roster.filter((e) => e.combatant.alive).map((e) => ({ x: e.combatant.x, z: e.combatant.z })),
        enemyShotRange,
      );
      // Bewegungs-Heat + Häscher-Lage (intern, nur fürs Log): Kessel/Fährte + Soll/lebende Häscher.
      const hSollLog = haescherSoll(runClock, heatState.kessel, heatState.faehrte);
      const hAliveLog = roster.reduce((n, e) => n + (e.combatant.alive && e.haescher ? 1 : 0), 0);
      // idle = Sekunden ohne Input; ab ~2 s ist „Hände weg" → Analyse ignoriert diese Zeilen.
      alog.log('snap', {
        ...(snap as unknown as Record<string, unknown>), idle: Math.round(idleFor), flow: flowState, rel,
        heat: { kes: +heatState.kessel.toFixed(2), fae: +heatState.faehrte.toFixed(2) },
        hae: { soll: hSollLog.front + hSollLog.ring, alive: hAliveLog },
        crit: schussTotal ? +(critTotal / schussTotal).toFixed(2) : 0, // tatsächliche Crit-Rate (Anteil der Schüsse)
        boni: { hp: playerBoni.maxHp, spd: +playerBoni.speed.toFixed(2), cc: +playerBoni.critChance.toFixed(2), cm: +playerBoni.critMult.toFixed(2), dge: +playerBoni.dodge.toFixed(2) }, // gewählte Level-Boni
      });
    }

    // Gegner-Verhalten (R2): jeder Typ steuert nach seinem Muster auf einen Zielpunkt zu,
    // hält bei seinem Standoff und feuert in Schussweite. Konter = Verhalten, nicht Stats.
    // Wegfahr-Exploit: KEIN Rubberband mehr — wer zu lange untätig ist, wird in den Fahrtweg gesetzt (s. u.).
    for (const e of roster) {
      if (!e.combatant.alive) continue;
      const er = e.view.root;
      e.buffs.tick(simDt); // empfängt Spieler-Debuffs (Zielmarkierung/Rauch)
      const mods = e.buffs.aggregate();
      e.combatant.incomingMul = mods.incomingMul;

      const out = behaviorTarget(e.behavior, {
        ex: er.position.x, ez: er.position.z, px, pz,
        pvx: playerVelX, pvz: playerVelZ, standoff: enemyShotRange, phase: e.phase,
      }, behaviorTuning);

      const distToPlayer = Math.hypot(px - er.position.x, pz - er.position.z) || 1;
      // Nachsetzen statt Rubberband: relevant (Timer-Reset) ist, wer in Schussreichweite ist ODER ein
      // Fadenkreuz trägt (markiert). Sonst untätig hochzählen; zu lange untätig → NAH um den Spieler neu
      // setzen (rundum ~45), damit er sofort wieder im Kampf ist statt weit voraus zu verschwinden.
      const traegtFadenkreuz = befehl.marks.some((m) => m.id === e.id);
      if (distToPlayer <= enemyShotRange || traegtFadenkreuz) e.untaetig = 0;
      else {
        e.untaetig = (e.untaetig ?? 0) + simDt;
        if (nachsetzenFaellig(e.untaetig, NACHSETZ_CFG)) {
          const p = spawnRundum(px, pz, () => aiRng.next(), NACHSETZ_CFG);
          er.position.x = p.x; er.position.z = p.z;
          e.combatant.x = p.x; e.combatant.z = p.z;
          e.untaetig = 0;
          continue; // diesen Frame nur umsetzen
        }
      }
      if (distToPlayer > out.standoff) {
        const tdx = out.tx - er.position.x, tdz = out.tz - er.position.z;
        const tl = Math.hypot(tdx, tdz) || 1;
        const feldDrin = combatStyle === 'aoe' && feldAn(raum, er.position.x, er.position.z, RAUM_CFG); // Raum: im Feld?
        const slowFactor = (e.gift ? 1 - giftSlow(e.gift, gartenCfg) : 1) * (feldDrin ? 1 - feldSlow(RAUM_CFG) : 1); // Gift- + Feld-Slow
        const step = e.speed * mods.speedMul * slowFactor * simDt; // Tempo type-/stufen-getrieben

        er.position.x += (tdx / tl) * step;
        er.position.z += (tdz / tl) * step;
        er.rotation.y = Math.atan2(tdx, tdz);
      }
      // Turm zielt unabhängig vom Fahrwerk immer auf den Spieler.
      { const yaw = Math.atan2(px - er.position.x, pz - er.position.z); e.view.turretNode.rotation.y = yaw - er.rotation.y; }
      e.fireCd -= simDt;
      if (distToPlayer <= enemyShotRange && e.fireCd <= 0) {
        // Fix A: aufs vorausberechnete Ziel feuern (wohin der Spieler fährt), nicht auf die
        // Ist-Position → reines Geradeausfahren ist keine Gratis-Unverwundbarkeit mehr.
        const tLead = (distToPlayer / PROJECTILE_SPEED) * enemyLeadGet();
        const aimX = px + playerVelX * tLead;
        const aimZ = pz + playerVelZ * tLead;
        const typeDmgMul = e.typeId === 'racer' ? racerDmgMul() : 1; // Racer-eigener Schadensfaktor
        enemyFire(er.position.x, er.position.z, aimX, aimZ, 'enemy', e.damage * mods.damageMul * typeDmgMul, e.typeId);
        e.fireCd = ENEMY_FIRE_COOLDOWN;
      }
      // RR (ab Stufe 2): wer schon im Feld war (gefangen), wird zur Feld-Mitte zurückgezogen, sobald er
      // an den Rand/heraus will. Häscher sind immun gegen den Zug (nur den Feld-Schaden kassieren sie).
      if (combatStyle === 'aoe' && evo.unlockedStagesByChannel.aoe_core >= 2 && e.feld?.gefangen && !e.haescher) {
        const nf = naechstesFeld(raum, er.position.x, er.position.z);
        if (nf) {
          const dist = Math.hypot(er.position.x - nf.x, er.position.z - nf.z) || 1;
          if (dist > feldRadius(RAUM_CFG, raum.buff) * 0.8) { // am Rand/draußen → zurückziehen
            const zug = zugZurMitte(nf, er.position.x, er.position.z);
            er.position.x += zug.dx * RAUM_CFG.zugStaerke * simDt;
            er.position.z += zug.dz * RAUM_CFG.zugStaerke * simDt;
          }
        }
      }
      e.combatant.x = er.position.x;
      e.combatant.z = er.position.z;
    }

    // Spieler-Combatant spiegeln. Schutzzone: kurz nach dem Erscheinen unverwundbar.
    playerCombatant.x = px;
    playerCombatant.z = pz;
    spawnGraceCd = Math.max(0, spawnGraceCd - simDt);
    playerCombatant.invulnerable = spawnGraceCd > 0;
    combat.update();

    // Sniper-Scope: an = Reichweite hoch + Kamera WEITER WEG (mehr Gebiet sichtbar, Panzer
    // bleibt mittig — kein Ranzoomen, kein verschobener Blick). Aus = alles zurück auf Default.
    if (combatStyle === 'sniper') {
      if (scopeActive && !scopeApplied) {
        savedShotRange = shotRange; shotRange = sniperRange;
        camApi?.set(sniperCamHeight, sniperCamBack, camF);
        scopeApplied = true; camReturn = 0; // laufende Rückkehr abbrechen
      } else if (!scopeActive && scopeApplied) {
        shotRange = savedShotRange; scopeApplied = false;
        // Befehl: mit Marken langsam zurückgleiten (Zeit, die markierten Ziele wegzuschießen), sonst schnell.
        camReturnDur = (!GIFT_BUILD && befehl.marks.length > 0) ? CAM_RETURN_SLOW : CAM_RETURN_FAST;
        camReturn = camReturnDur;
      }
      // Kamera-Rückkehr aus dem Scope sanft interpolieren (statt hartem Sprung).
      if (camReturn > 0) {
        // Marken weggeschossen → das langsame Ziel-Fenster ist erfüllt, ab jetzt zügig fertig zoomen.
        if (!GIFT_BUILD && befehl.marks.length === 0 && camReturnDur > CAM_RETURN_FAST) {
          const done = 1 - camReturn / camReturnDur; // bisheriger Fortschritt beibehalten
          camReturnDur = CAM_RETURN_FAST;
          camReturn = camReturnDur * (1 - done);
        }
        camReturn = Math.max(0, camReturn - realDt);
        const p = 1 - camReturn / camReturnDur; // 0 → 1
        camApi?.set(sniperCamHeight + (camH - sniperCamHeight) * p, sniperCamBack + (camB - sniperCamBack) * p);
        if (camReturn <= 0) applyCam(); // final exakt auf Normal
      }
    }

    // DoT-Ticks: Gift tickt pro Gegner runter (kann töten → rückwärts iterieren).
    for (let i = roster.length - 1; i >= 0; i--) {
      const e = roster[i];
      if (!e || !e.combatant.alive || !e.dot) continue;
      e.dot.left -= simDt;
      e.dot.tickCd -= simDt;
      if (e.dot.tickCd <= 0) { e.dot.tickCd += dotEvery; damageEnemyTick(e, dotDmg); }
      if (e.combatant.alive && e.dot && e.dot.left <= 0) e.dot = undefined;
    }

    // SEUCHE (Z-Z-Z) — STUFENWEISE nach buildStufe: St 1 nur Köchel-DoT (kein Reifen/Ansteckung);
    // ab St 2 reifen + anstecken (reif steht & stirbt am Gift); ab St 3 gibt der reife Gift-Tod
    // Erntefieber. Plus die grau-Animation der geernteten Panzer.
    if (GIFT_BUILD) {
      const stufe = evo.unlockedStagesByChannel.dot_core;
      for (let i = roster.length - 1; i >= 0; i--) {
        const e = roster[i];
        if (!e) continue;
        if (e.harvested != null) {
          // Geerntet: grau, sackt zusammen, dann Tod (kein Ticken/Bewegung/Targeting mehr — alive=false).
          e.harvested -= simDt;
          e.view.root.position.y = -0.6 * (1 - Math.max(0, e.harvested) / GARTEN_HARVEST_TIME);
          if (e.harvested <= 0) killEnemy(e, 'player');
          continue;
        }
        if (!e.combatant.alive || !e.gift) continue;

        if (stufe < 2) {
          // St 1 (Z): reiner Köchel-DoT — kein Reifen, kein Reif-Status, keine Ansteckung. Tötet langsam.
          e.gift.tickCd -= simDt;
          if (e.gift.tickCd <= 0) { e.gift.tickCd += gartenCfg.tickEvery; damageEnemyTick(e, giftDotEff, 'gift'); }
          if (e.combatant.alive) setGiftGlow(e, 1); // konstant giftgrün (reift nicht)
          continue;
        }

        // St 2+ (ZZ/ZZZ): volle Seuche — reifen, reif=tödlich, Ansteckung.
        const warReif = istReif(e.gift, gartenCfg); // schon reif → dieser Tick ist tödliches Gift
        const r = tickGift(e.gift, simDt, gartenCfg, erntefieber); // köchelt+reift, oder reif→tödlich
        if (r.dmg > 0) {
          e.combatant.hp -= r.dmg;
          metrics.onHitDealt(r.dmg);
          floatNums.spawn(e.combatant.x, e.combatant.z, r.dmg, warReif ? '#ff7043' : '#9be36b'); // reif = tödlich-orange, köchel = grün

          if (e.combatant.hp <= 0) {
            e.combatant.hp = 0; e.combatant.alive = false;
            if (warReif && stufe >= 3 && !e.haescher) {
              doErnte(e); // ZZZ: Ernte = Erntefieber + aktive Ult-Effekte (Heilung/Ausbruch) — NIE für Häscher
            } else if (warReif) {
              // ZZ (noch kein ZZZ): reif gestorben, grau-Optik, aber kein Erntefieber.
              e.harvested = GARTEN_HARVEST_TIME; e.gift = undefined; setEnemyGlow(e, GIFT_GREY);
            } else {
              killEnemy(e, 'player'); // mitten in der Reifung gestorben → normaler Tod, kein Buff
            }
            continue;
          }
        }
        // Gnadenstoß (Befehl-Ult, aktiv): angesteckte Panzer unter der HP-Schwelle sofort ernten.
        if (skill.ult === 'gnadenstoss' && ultActive > 0 && !e.haescher && e.combatant.alive && e.gift && e.combatant.hp < EXECUTE_FRAC * e.combatant.maxHp) {
          doErnte(e); continue;
        }
        // ANSTECKUNG: bei jedem Tick steckt der Infizierte den NÄCHSTEN Gesunden in Reichweite an.
        if (r.ticked) {
          let best: Enemy | null = null, bestD = gartenCfg.ansteckRadius;
          for (const o of roster) {
            if (o === e || !o.combatant.alive || o.gift || o.harvested != null) continue;
            const d = Math.hypot(o.combatant.x - e.combatant.x, o.combatant.z - e.combatant.z);
            if (d < bestD) { bestD = d; best = o; }
          }
          if (best) {
            best.gift = saeGift(undefined, gartenCfg);
            alog.log('dot', { id: best.id, src: 'ansteckung', von: e.id, typ: best.typeId, t: +runClock.toFixed(1) });
          }
        }
        // Glühen grün→rot; reif pulsiert (raucht/krank, wartet auf den Tod).
        if (e.gift && e.combatant.alive) {
          const st = reifeStufe(e.gift, gartenCfg);
          if (st >= 3) setEnemyGlow(e, GIFT_GLOW[3]!.scale(0.55 + 0.45 * Math.sin(runClock * 7)));
          else setGiftGlow(e, st);
        }
      }
    }

    // Zielnetz-Kontamination: liegende Marken ticken Schaden auf den markierten Gegner (ab St2 auch
    // auf Gegner in der Nähe = „Druck im Raum zwischen den Zielen"). Abgelaufene/tote Marken raus.
    if (netMarks.length) {
      netTickCd -= simDt;
      const doTick = netTickCd <= 0;
      if (doTick) netTickCd = DAMAGE_TICK;
      const spread = evo.unlockedStagesByChannel.sniper_aoe_dot >= 2;
      for (let i = netMarks.length - 1; i >= 0; i--) {
        const nm = netMarks[i]!;
        nm.left -= simDt;
        const e = roster.find((r) => r.id === nm.id && r.combatant.alive);
        if (!e || nm.left <= 0) { netMarks.splice(i, 1); continue; }
        if (doTick) {
          damageEnemyTick(e, netDmg);
          if (spread && e.combatant.alive) {
            for (const o of roster) {
              if (o === e || !o.combatant.alive) continue;
              if (Math.hypot(o.combatant.x - e.combatant.x, o.combatant.z - e.combatant.z) <= netSpreadR) damageEnemyTick(o, Math.round(netDmg * 0.5));
            }
          }
        }
      }
    }

    // Raum-Felder: jeder Gegner IM Feld nimmt pro Tick Schaden (Anfangs-HP/ticksZumTod + Ernte-Buff,
    // Crit wirkt mit). Ein im Feld gestorbener Gegner gibt ab RRR die Ernte (buff↑). Felder bleiben
    // liegen (FIFO via placeAoeField); die Discs wachsen mit dem Buff. Rückwärts, weil Kills splicen.
    if (combatStyle === 'aoe') {
      const stufeRRR = evo.unlockedStagesByChannel.aoe_core >= 3;
      for (let j = roster.length - 1; j >= 0; j--) {
        const e = roster[j];
        if (!e || !e.combatant.alive) continue;
        e.feld ??= { tickCd: 0, gefangen: false };
        const drin = !!feldAn(raum, e.combatant.x, e.combatant.z, RAUM_CFG);
        const basisHp = GARTEN_BASIS[e.typeId]?.hp ?? GARTEN_BASIS.allrounder!.hp;
        const tick = tickFeld(e.feld, drin, basisHp, raum.buff, simDt, RAUM_CFG);
        if (tick.ticked && tick.dmg > 0) {
          damageEnemyTick(e, mitCrit(tick.dmg), 'sonst');
          if (stufeRRR && !e.combatant.alive && !e.haescher) ernteFeldKill(raum); // RRR: Feld-Kill = Ernte
        }
      }
      const sc = feldRadius(RAUM_CFG, raum.buff) / RAUM_CFG.radius; // Felder wachsen mit dem Ernte-Buff
      for (const d of feldDiscs) d.scaling.x = d.scaling.z = sc;
    }

    ground.update();
    projectileView.sync();
    aimDebug.update();

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
      ...roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({ x: e.combatant.x, z: e.combatant.z, color: '#e8a23c' })),
    ]);
    if (ARENA_MODE) {
      const mag = `${'●'.repeat(ammo)}${'○'.repeat(AMMO_MAX - ammo)}`;
      let txt = reloadCd > 0
        ? `⟳ Nachladen ${reloadCd.toFixed(1)}s`
        : (ammo <= 0 || slomoTime <= 0.05)
          ? `Munition ${mag} · Slomo ${slomoTime.toFixed(1)}s — R nachladen`
          : `Munition ${mag} · Slomo ${slomoTime.toFixed(1)}s`;
      ammoHud.textContent = txt;
      // Befehl-Macht (BB+): A = laufender Aufbau (gelb, an der Kette) | B = gehaltener Buff (orange,
      // BB-Countdown bzw. BBB-permanent ∞) — zwei getrennte Blöcke, sofort unterscheidbar.
      if (!GIFT_BUILD && evo.unlockedStagesByChannel.sniper_core >= 2) {
        const teile: string[] = [];
        const auf = aufbauStufe(befehl);
        if (befehl.kette > 0) { // A: nur sichtbar, solange eine Kette läuft
          const reihe = Math.min(MAX_MARKS, befehl.kette);
          const aufTxt = auf > 0 ? ` <span style="color:#ffd166">▸ +${auf}</span>` : '';
          teile.push(`<span style="color:#bfe3ff">⛓ ${reihe}${befehl.kette > MAX_MARKS ? '' : '/' + MAX_MARKS}</span>${aufTxt} <span style="color:#7fa8c9;font-size:0.82em">⏱${Math.max(0, befehl.combo).toFixed(1)}s</span>`);
        }
        if (befehl.buffStufe > 0) { // B: gehaltener Buff — grün; BB Countdown, BBB permanent (∞)
          teile.push(befehl.buffRest < 0
            ? `<span style="color:#7bdc5a">🔥 +${befehl.buffStufe} ∞</span>`
            : `<span style="color:#9be36b">🔥 +${befehl.buffStufe} · ${Math.max(0, befehl.buffRest).toFixed(1)}s</span>`);
        }
        if (teile.length) { befehlHud.style.display = 'block'; befehlHud.innerHTML = teile.join('<span style="opacity:0.35">&nbsp;&nbsp;|&nbsp;&nbsp;</span>'); }
        else befehlHud.style.display = 'none';
      } else if (befehlHud.style.display !== 'none') befehlHud.style.display = 'none';
    }
    updateUltHud();
    const skillPunkte = GIFT_BUILD ? skill.punkte : befehlSkill.punkte;
    if (ARENA_MODE && skillPunkte > 0 && !skillOpen) {
      skillHint.style.display = 'block';
      skillHint.textContent = `✦ ${skillPunkte} Skillpunkt${skillPunkte > 1 ? 'e' : ''} frei — [T]`;
    } else skillHint.style.display = 'none';
    // HP-Balken schweben über den Gegnern.
    enemyBars.update(
      roster
        .filter((e) => e.combatant.alive)
        .map((e) => ({
          x: e.combatant.x,
          z: e.combatant.z,
          hpFrac: e.combatant.hp / e.combatant.maxHp,
          hp: e.combatant.hp,
          hpMax: e.combatant.maxHp,
          name: e.displayName,
          level: e.level,
          mk: enemyMk(e.level),
          typeLabel: ENEMY_TYPES[e.typeId]?.label,
          typeColor: ENEMY_TYPES[e.typeId]?.color,
          marks: e.buffs.active().reduce(
            (s, b) => s + (b.id === 'markiert' ? '🎯' : b.id === 'vernebelt' ? '💨' : ''),
            '',
          ),
        })),
    );

    floatNums.update(realDt); // schwebende Schadenszahlen weiterbewegen + ausblenden (Echtzeit)

    // Schwarm-Lage anzeigen: Anzahl je Typ (lebend) + Zieldichte + aktuelles Mix-Gewicht.
    {
      const plan = currentSwarmPlan();
      const aliveByType: Record<string, number> = {};
      for (const e of roster) if (e.combatant.alive) aliveByType[e.typeId] = (aliveByType[e.typeId] ?? 0) + 1;
      swarmHud.update({
        alive: roster.reduce((n, e) => n + (e.combatant.alive ? 1 : 0), 0),
        targetCount: plan.targetCount,
        rows: Object.values(ENEMY_TYPES).map((t) => ({
          label: t.label, color: t.color,
          count: aliveByType[t.id] ?? 0,
          weight: plan.weights[t.id] ?? 0,
        })),
      });
      heatHud?.update(director.states().map((s) => ({
        label: STYLE_LABEL[s.id] ?? s.id, heat: Math.round(s.heat), stufe: s.stufe,
      })));
    }

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
    // Befehl-Ult-Effekte (während aktiv): kommando = Auto-Exekution (eins nach dem anderen),
    // streuung/seuche = Flächen-Markierung aller sichtbaren Ziele (kein Counter); seuche zusätzlich DoT.
    if (!GIFT_BUILD && ultActive > 0) {
      if (befehlSkill.ult === 'kommando') {
        const ziele = Math.min(MAX_MARKS, 1 + befehlSkill.ranks.pol * POL_UEBERMACHT_PRO_RANG); // Übermacht: mehr gleichzeitige Auto-Ziele
        const lebende = befehl.marks.filter((m) => roster.some((r) => r.id === m.id && r.combatant.alive));
        if (lebende.length < ziele) autoMarkEins(screenBlips);
        if (lebende.length) {
          const ziel = lebende.reduce((a, b) => (a.order < b.order ? a : b)); // nächste lebende Marke
          befehl.nextOrder = ziel.order; // als „aktuell" setzen → Auto-Hit ohne Vorgriff-Bruch
          befehlSchuss(ziel.id);
        }
      } else {
        const slowEff = Math.max(0, MARK_SLOW - (befehlSkill.ult === 'streuung' ? befehlSkill.ranks.pol * POL_KLAMMER_PRO_RANG : 0)); // Klammergriff
        for (const b of screenBlips) {
          const r = roster.find((x) => x.id === b.id);
          if (!r || !r.combatant.alive) continue;
          if (!r.buffs.active().some((bf) => bf.id === 'markiert')) r.buffs.add({ id: 'markiert', icon: befehlSkill.ult === 'seuche' ? '☣' : '🎯', label: 'markiert', speedMul: slowEff, duration: 0.5 });
          if (befehlSkill.ult === 'seuche' && !r.dot) r.dot = { left: dotDur, tickCd: dotEvery };
        }
      }
    }
    // Kommandant: Auto-Targeting. Jeden Frame die Ziele bestimmen, die der nächste Schuss trifft
    // (1..maxMarks je Kern-Stufe, Prio dumm→schlau). Cursor-Fadenkreuz = Feuerbereitschaft,
    // Ringe = die getroffenen Ziele. Bei maxMarks=1 ist das der bisherige Einzel-Schuss.
    // Befehl: Combo-Timer (ab BB) läuft bei aktiver Kette runter — Ablauf bricht sie. Tote Marken putzen.
    if (!GIFT_BUILD) {
      // Ketten-Timer + Buff-B-Countdown (ab BB). Der Abriss reißt nur die LAUFENDE Kette — der gehaltene
      // Bonus (Buff B / perma-Sockel bei BBB) bleibt; main räumt nur die Slow-Marken auf.
      if (evo.unlockedStagesByChannel.sniper_core >= 2) {
        if (tickBefehl(befehl, realDt).abriss) { entmarkiereAlle(); bruch(befehl); showToast('✗ KETTE GERISSEN', '#ff6b6b'); }
      }
      if (befehl.marks.length && !befehl.marks.some((m) => roster.some((r) => r.id === m.id && r.combatant.alive))) {
        befehl.marks = []; befehl.nextOrder = 1; // keine lebenden Markierten mehr
      }
      // Auto-Markierer (ab BB): einzeln das nächste Ziel in Reichweite nachziehen (4·5·6…), wenn die vorige Marke weg ist.
      if (evo.unlockedStagesByChannel.sniper_core >= 2 && autoMarkBereit(befehl, evo.unlockedStagesByChannel.sniper_core >= 3)) autoMarkEins(screenBlips);
      // Eiserne Disziplin: eine Schutz-Ladung lädt nach, sobald eine Kette ≥ SCHUTZ_NACHLADE_KETTE erreicht (nicht während einer Ult).
      if (befehl.kette >= SCHUTZ_NACHLADE_KETTE && prevKette < SCHUTZ_NACHLADE_KETTE && ultActive <= 0) schutzLadungen = Math.min(befehlSkill.ranks.disziplin, schutzLadungen + 1);
      prevKette = befehl.kette;
      schutzLadungen = Math.min(schutzLadungen, befehlSkill.ranks.disziplin); // clamp auf max = Rang
    }

    if (sniperCrosshair) {
      if (combatStyle === 'sniper' && scopeActive) {
        const col = fireCd <= 0 ? '#9be36b' : '#ffa94d'; // grün = feuerbereit, orange = nachladen
        if (ARENA_MODE) {
          // Garten: DU wählst, wen du ansäst — Ziel unter dem Cursor. Manuell verteilen statt Auto-Snap.
          // Fadenkreuz IMMER aufs Cursor-Ziel zeigen (im Cooldown orange statt verschwinden) — sonst
          // flackert beim Nachfeuern die Zielmarke weg ("seltsam"). Feuerbar nur ohne Cooldown.
          const cand = nearestToPointer(mouseX, mouseY, screenBlips, GARTEN_SNAP_PX);
          sniperTargets = fireCd <= 0 && cand ? [cand] : [];
          const cb = cand ? screenBlips.find((b) => b.id === cand) : null;
          if (cb) {
            sniperCrosshair.style.display = 'block';
            sniperCrosshair.style.left = cb.sx + 'px';
            sniperCrosshair.style.top = cb.sy + 'px';
            sniperCrosshair.querySelectorAll<HTMLElement>('[data-ring],[data-tick]').forEach((el) => {
              if (el.hasAttribute('data-ring')) el.style.borderColor = col; else el.style.background = col;
            });
          } else sniperCrosshair.style.display = 'none';
          if (GIFT_BUILD) {
            for (const m of markPool) m.style.display = 'none'; // Garten: keine Marken-Ringe
            if (scopeBadge) {
              const bs = evo.unlockedStagesByChannel.dot_core;
              const nm = BUILD_STUFE_NAME[Math.min(bs, BUILD_STUFE_NAME.length - 1)];
              scopeBadge.textContent = bs >= 3 ? `🦠 St${bs} · ${nm} — Erntefieber +${erntefieber}` : `🦠 St${bs} · ${nm}`;
            }
          } else {
            // Befehl: markPool zeigt die bereits markierten Ziele (gelbe Ringe über ihnen).
            for (let i = 0; i < markPool.length; i++) {
              const mk = befehl.marks[i];
              const mb = mk ? screenBlips.find((b) => b.id === mk.id) : null;
              if (mb) {
                markPool[i]!.style.display = 'block';
                markPool[i]!.style.left = mb.sx + 'px';
                markPool[i]!.style.top = mb.sy + 'px';
                markPool[i]!.style.borderColor = '#ffd166';
                markPool[i]!.textContent = evo.unlockedStagesByChannel.sniper_core >= 2 ? String(mk!.nr) : ''; // fortlaufende Nummer (1·2·3 → 4·5·6…) ab BB
              } else markPool[i]!.style.display = 'none';
            }
            if (scopeBadge) {
              const bs = evo.unlockedStagesByChannel.sniper_core;
              const nm = BEFEHL_STUFE_NAME[Math.min(bs, BEFEHL_STUFE_NAME.length - 1)];
              scopeBadge.textContent = bs < 1 ? `🔭 St0 · ${nm}`
                : bs < 2 ? `🎯 St1 · ${nm} — geschwächt: ${befehl.marks.length}` // B = reiner Debuff, kein Reihen-Counter
                : `🎯 St${bs} · ${nm} — Marken ${befehl.marks.length}/${MAX_MARKS}`;
            }
          }
        } else {
          const coreStage = evo.unlockedStagesByChannel.sniper_core;
          sniperTargets = fireCd <= 0 ? pickTargets(maxMarks(), coreStage, px, pz, sniperRange) : [];
          sniperCrosshair.style.display = 'none'; // Auto-Targeting: Feedback nur über die Ziel-Ringe
          for (let i = 0; i < markPool.length; i++) {
            const tb = i < sniperTargets.length ? screenBlips.find((b) => b.id === sniperTargets[i]) : null;
            if (tb) {
              markPool[i]!.style.display = 'block';
              markPool[i]!.style.left = tb.sx + 'px';
              markPool[i]!.style.top = tb.sy + 'px';
              markPool[i]!.style.borderColor = col;
            } else markPool[i]!.style.display = 'none';
          }
          if (scopeBadge) {
            const tgt = coreStage >= 1 ? 'Racer' : 'Allrounder';
            const cnt = maxMarks();
            scopeBadge.textContent = `🔭 SCOPE · Ziel: ${tgt}${cnt > 1 ? ` ×${cnt}` : ''}`;
          }
        }
      } else if (!GIFT_BUILD && combatStyle === 'sniper' && befehl.marks.length) {
        // Befehl im Fahrmodus: Marken-Ringe bleiben sichtbar (man schießt ohne Scope). Aktuelles Ziel grün.
        sniperCrosshair.style.display = 'none';
        for (let i = 0; i < markPool.length; i++) {
          const mk = befehl.marks[i];
          const mb = mk ? screenBlips.find((b) => b.id === mk.id) : null;
          if (mb) {
            markPool[i]!.style.display = 'block';
            markPool[i]!.style.left = mb.sx + 'px';
            markPool[i]!.style.top = mb.sy + 'px';
            const bb = evo.unlockedStagesByChannel.sniper_core >= 2; // Reihenfolge/Nummern erst ab BB
            markPool[i]!.style.borderColor = bb && mk!.order === befehl.nextOrder ? '#9be36b' : '#ffd166';
            markPool[i]!.textContent = bb ? String(mk!.nr) : ''; // fortlaufende Nummer (1·2·3 → 4·5·6…); bei B kein Counter
          } else markPool[i]!.style.display = 'none';
        }
      } else {
        if (sniperCrosshair.style.display !== 'none') sniperCrosshair.style.display = 'none';
        for (const m of markPool) if (m.style.display !== 'none') m.style.display = 'none';
      }
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
        ...roster
          .filter((e) => e.combatant.alive)
          .map((e) => ({
            id: e.id, x: e.combatant.x, z: e.combatant.z,
            color: '#e8a23c', r: 4,
            name: e.displayName,
            sub: `Lvl ${e.level} · MK${enemyMk(e.level)}`,
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

mountStartScreen((style) => boot(style));
