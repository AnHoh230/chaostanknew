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
import { buildIronwastePreview } from './world/map/assetLabModel';
import { IRONWASTE_V1_PREVIEW_KIT } from './world/map/ironwasteStyleKit';
import { createWorldStylePreview, type WorldStylePreviewHandle } from './world/map/worldStylePreviewRenderer';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`asset-lab-element-missing:${id}`);
  return element as T;
}

function querySeed(name: string, fallback: number): number {
  const value = Number(new URLSearchParams(location.search).get(name));
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

const canvas = requiredElement<HTMLCanvasElement>('assetLabCanvas');
const worldInput = requiredElement<HTMLInputElement>('worldSeed');
const visualInput = requiredElement<HTMLInputElement>('visualSeed');
const renderedCount = requiredElement<HTMLElement>('renderedCount');
const classCount = requiredElement<HTMLElement>('classCount');
const omittedCount = requiredElement<HTMLElement>('omittedCount');
const scope = requiredElement<HTMLElement>('scope');
const status = requiredElement<HTMLElement>('status');
const assetFamilyGallery = requiredElement<HTMLElement>('assetFamilyGallery');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.075, 1);

const camera = new ArcRotateCamera('assetLabCamera', -Math.PI / 2, 0.82, 520, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 45;
camera.upperRadiusLimit = 1100;
camera.wheelPrecision = 2.5;
camera.panningSensibility = 55;

const sky = new HemisphericLight('assetLabSky', new Vector3(0.25, 1, 0.15), scene);
sky.intensity = 0.92;
sky.groundColor = new Color3(0.24, 0.22, 0.2);
const sun = new DirectionalLight('assetLabSun', new Vector3(-0.45, -1, 0.32), scene);
sun.intensity = 1.35;

let worldSeed = querySeed('seed', 19);
let visualSeed = querySeed('visualSeed', 1);
let preview: WorldStylePreviewHandle | null = null;

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
    preview = createWorldStylePreview(scene, model.plan, IRONWASTE_V1_PREVIEW_KIT);
    assetFamilyGallery.replaceChildren(...model.spriteFamilies.map((family) => {
      const figure = document.createElement('figure');
      figure.className = 'asset-family-card';
      figure.title = `${family.demandClass} · ${family.familyId}`;
      const image = document.createElement('img');
      image.src = `./${family.file}`;
      image.alt = family.demandClass;
      image.loading = 'eager';
      const caption = document.createElement('figcaption');
      caption.textContent = family.demandClass;
      figure.append(image, caption);
      return figure;
    }));
    renderedCount.textContent = String(model.stats.renderedPlacements);
    classCount.textContent = String(model.stats.renderedClasses.length);
    omittedCount.textContent = String(model.stats.omittedDemands);
    const omittedLines = Object.entries(model.stats.omittedByClass)
      .map(([demandClass, count]) => `${demandClass.padEnd(31, ' ')} ${String(count).padStart(5, ' ')}`);
    scope.textContent = [
      `SICHTBAR: ${model.stats.renderedClasses.join(', ')}`,
      '',
      'AUSSERHALB DES PREVIEW-SCOPES:',
      ...omittedLines,
    ].join('\n');
    status.dataset.state = 'ready';
    status.textContent = `${model.plan.kitId} v${model.plan.kitVersion} · Katalog ${model.plan.catalogSignature}`;
  } catch (error) {
    assetFamilyGallery.replaceChildren();
    renderedCount.textContent = '0';
    classCount.textContent = '0';
    omittedCount.textContent = '–';
    scope.textContent = '';
    status.dataset.state = 'error';
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

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
