import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { TANK_CLASSES } from './game/classes';
import {
  buildIronwastePreview,
  computeAssetLabCameraView,
  parseAssetLabSeed,
  type IronwastePreviewModel,
} from './world/map/assetLabModel';
import { waehleKarte } from './world/map/curatedMaps';
import { IRONWASTE_V1_PREVIEW_KIT } from './world/map/ironwasteStyleKit';
import { createWorldStylePreview, type WorldStylePreviewHandle } from './world/map/worldStylePreviewRenderer';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`asset-lab-element-missing:${id}`);
  return element as T;
}

const canvas = requiredElement<HTMLCanvasElement>('assetLabCanvas');
const worldInput = requiredElement<HTMLInputElement>('worldSeed');
const visualInput = requiredElement<HTMLInputElement>('visualSeed');
const totalCount = requiredElement<HTMLElement>('totalCount');
const resolvedCount = requiredElement<HTMLElement>('resolvedCount');
const missingCount = requiredElement<HTMLElement>('missingCount');
const scope = requiredElement<HTMLElement>('scope');
const status = requiredElement<HTMLElement>('status');
const scaleInfo = requiredElement<HTMLElement>('scaleInfo');
const worldViewButton = requiredElement<HTMLButtonElement>('worldView');
const playerViewButton = requiredElement<HTMLButtonElement>('playerView');
const assetFamilyGallery = requiredElement<HTMLElement>('assetFamilyGallery');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.075, 1);

const camera = new ArcRotateCamera('assetLabCamera', -Math.PI / 2, 0.82, 520, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 14;
camera.upperRadiusLimit = 1100;
camera.wheelPrecision = 2.5;
camera.panningSensibility = 55;

const sky = new HemisphericLight('assetLabSky', new Vector3(0.25, 1, 0.15), scene);
sky.intensity = 0.92;
sky.groundColor = new Color3(0.24, 0.22, 0.2);
const sun = new DirectionalLight('assetLabSun', new Vector3(-0.45, -1, 0.32), scene);
sun.intensity = 1.35;

const startWorldSeed = waehleKarte(0).seed;
const playerClass = TANK_CLASSES[0];
if (!playerClass) throw new Error('asset-lab-player-class-missing');
let worldSeed = parseAssetLabSeed(location.search, 'seed', startWorldSeed);
let visualSeed = parseAssetLabSeed(location.search, 'visualSeed', 1);
let preview: WorldStylePreviewHandle | null = null;
let currentModel: IronwastePreviewModel | null = null;
let activeView: 'world' | 'player' | 'asset' = 'world';
let activeFamilyId: string | null = null;

function setViewButtons(): void {
  worldViewButton.setAttribute('aria-pressed', String(activeView === 'world'));
  playerViewButton.setAttribute('aria-pressed', String(activeView === 'player'));
  for (const card of assetFamilyGallery.querySelectorAll<HTMLButtonElement>('.asset-family-card')) {
    card.setAttribute('aria-pressed', String(activeView === 'asset' && card.dataset.familyId === activeFamilyId));
  }
}

function applyWorldView(model: IronwastePreviewModel): void {
  const view = computeAssetLabCameraView({ kind: 'world', extents: model.world.extents });
  camera.setTarget(new Vector3(view.target.x, 0, view.target.z));
  camera.alpha = view.alpha;
  camera.beta = view.beta;
  camera.radius = view.radius;
  preview?.playerReference?.setScaleView(false);
  activeView = 'world';
  activeFamilyId = null;
  setViewButtons();
}

function applyPlayerView(model: IronwastePreviewModel): void {
  const view = computeAssetLabCameraView({ kind: 'player', position: model.scale.spawn });
  camera.setTarget(new Vector3(view.target.x, 0, view.target.z));
  camera.alpha = view.alpha;
  camera.beta = view.beta;
  camera.radius = view.radius;
  preview?.playerReference?.setScaleView(true);
  activeView = 'player';
  activeFamilyId = null;
  setViewButtons();
}

function applyAssetView(model: IronwastePreviewModel, familyId: string): void {
  const placement = model.plan.placements.find((entry) => (
    entry.asset.status === 'resolved'
    && entry.asset.familyId === familyId
  ));
  if (!placement || placement.asset.status !== 'resolved') return;
  if (placement.kind !== 'landscape' && placement.kind !== 'site' && placement.kind !== 'entrance') return;
  const footprint = placement.kind === 'entrance'
    ? { halfX: Math.max(2, placement.width / 2 + 1), halfZ: 2.5 }
    : placement.footprint;
  const view = computeAssetLabCameraView({
    kind: 'asset',
    position: placement.position,
    footprint,
  });
  camera.setTarget(new Vector3(view.target.x, 0, view.target.z));
  camera.alpha = view.alpha;
  camera.beta = view.beta;
  camera.radius = view.radius;
  preview?.playerReference?.setScaleView(false);
  activeView = 'asset';
  activeFamilyId = familyId;
  setViewButtons();
}

function syncUrl(): void {
  const url = new URL(location.href);
  url.searchParams.set('seed', String(worldSeed));
  url.searchParams.set('visualSeed', String(visualSeed));
  history.replaceState(null, '', url);
}

function renderPreview(): void {
  preview?.dispose();
  preview = null;
  status.dataset.state = 'loading';
  status.textContent = 'Generator und PlacementPlan werden aufgebaut …';
  try {
    const model = buildIronwastePreview(worldSeed, visualSeed);
    currentModel = model;
    preview = createWorldStylePreview(scene, model.plan, IRONWASTE_V1_PREVIEW_KIT, {
      player: {
        position: model.scale.spawn,
        collisionRadius: 1.5,
        composition: playerClass.composition,
      },
    });
    assetFamilyGallery.replaceChildren(...model.spriteFamilies.map((family) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'asset-family-card';
      card.dataset.familyId = family.familyId;
      card.title = family.occurrenceCount > 0
        ? `${family.demandClass} · ${family.occurrenceCount}× verbaut · klicken zum Fokussieren`
        : `${family.demandClass} · in diesem Seed nicht erzeugt`;
      card.disabled = family.occurrenceCount === 0;
      card.setAttribute('aria-pressed', 'false');
      const image = document.createElement('img');
      image.src = `./${family.file}`;
      image.alt = family.demandClass;
      image.loading = 'eager';
      const caption = document.createElement('span');
      caption.className = 'asset-caption';
      const name = document.createElement('span');
      name.className = 'asset-name';
      name.textContent = family.demandClass;
      const count = document.createElement('span');
      count.className = 'asset-count';
      count.textContent = `${family.occurrenceCount}×`;
      caption.append(name, count);
      card.append(image, caption);
      card.addEventListener('click', () => applyAssetView(model, family.familyId));
      return card;
    }));
    const startLabel = worldSeed === startWorldSeed ? 'AKTUELLE STARTWELT' : 'GENERATOR-SEED';
    scaleInfo.textContent = [
      `${startLabel} ${worldSeed} · ${model.scale.worldWidth} × ${model.scale.worldDepth} WE`,
      `echter Panzer am Spawn · Trefferkreis Ø 3 WE · Sites Ø ${model.scale.siteDiameter.min.toFixed(0)}–${model.scale.siteDiameter.max.toFixed(0)} WE`,
    ].join('\n');
    totalCount.textContent = String(model.stats.totalPlacements);
    resolvedCount.textContent = String(model.stats.resolvedPlacements);
    missingCount.textContent = String(model.stats.missingPlacements);
    const missingLines = Object.entries(model.stats.missingByClass)
      .map(([demandClass, count]) => `${demandClass.padEnd(31, ' ')} ${String(count).padStart(5, ' ')}`);
    scope.textContent = [
      `ECHTE ASSETS: ${model.stats.resolvedClasses.join(', ')}`,
      '',
      'FEHLENDE ASSETFAMILIEN (MAGENTA):',
      ...missingLines,
    ].join('\n');
    status.dataset.state = model.stats.missingPlacements > 0 ? 'incomplete' : 'ready';
    status.textContent = model.stats.missingPlacements > 0
      ? `${model.stats.missingPlacements} Generator-Occurrences warten auf echte Assets · Katalog ${model.plan.catalogSignature}`
      : `${model.plan.kitId} v${model.plan.kitVersion} vollständig · Katalog ${model.plan.catalogSignature}`;
    if (activeView === 'player') applyPlayerView(model);
    else applyWorldView(model);
  } catch (error) {
    currentModel = null;
    assetFamilyGallery.replaceChildren();
    totalCount.textContent = '0';
    resolvedCount.textContent = '0';
    missingCount.textContent = '–';
    scope.textContent = '';
    scaleInfo.textContent = 'Weltmaßstab konnte nicht ermittelt werden.';
    status.dataset.state = 'error';
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

worldViewButton.addEventListener('click', () => {
  if (currentModel) applyWorldView(currentModel);
});
playerViewButton.addEventListener('click', () => {
  if (currentModel) applyPlayerView(currentModel);
});

function applySeeds(): void {
  worldInput.value = String(worldSeed);
  visualInput.value = String(visualSeed);
  syncUrl();
  renderPreview();
}

function bindStep(buttonId: string, kind: 'world' | 'visual', delta: number): void {
  requiredElement<HTMLButtonElement>(buttonId).addEventListener('click', () => {
    if (kind === 'world') worldSeed += delta;
    else visualSeed += delta;
    applySeeds();
  });
}

bindStep('worldPrev', 'world', -1);
bindStep('worldNext', 'world', 1);
bindStep('visualPrev', 'visual', -1);
bindStep('visualNext', 'visual', 1);
worldInput.addEventListener('change', () => {
  const next = Number(worldInput.value);
  if (Number.isFinite(next)) worldSeed = Math.trunc(next);
  applySeeds();
});
visualInput.addEventListener('change', () => {
  const next = Number(visualInput.value);
  if (Number.isFinite(next)) visualSeed = Math.trunc(next);
  applySeeds();
});
window.addEventListener('resize', () => engine.resize());
window.addEventListener('beforeunload', () => {
  preview?.dispose();
  scene.dispose();
  engine.dispose();
});

applySeeds();
engine.runRenderLoop(() => scene.render());
