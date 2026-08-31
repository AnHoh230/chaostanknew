import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readPng } from './pngDrawing.mjs';

const root = process.cwd();
const candidateDir = path.resolve(root, 'public/style-kits/ironwaste-v1/candidates');
const manifestPath = path.resolve(root, 'src/world/map/ironwasteCandidateManifest.json');
const generatedDir = path.resolve(root, 'docs/generated');
const catalog = JSON.parse(fs.readFileSync(path.join(generatedDir, 'required-asset-catalog.json'), 'utf8'));
const seedCoverage = JSON.parse(fs.readFileSync(path.join(generatedDir, 'asset-seed-coverage.json'), 'utf8'));
const approve = process.argv.includes('--approve');

const BIOMES = ['crater', 'industrial', 'mud', 'ruins', 'scrap', 'wasteland'];
const groundSpecs = BIOMES.map((biome) => ({
  name: `ground_${biome}.png`, tileX: true, tileY: true, alphaVariation: false, width: 256, height: 256,
}));
const transitionSpecs = BIOMES.flatMap((left, leftIndex) => (
  BIOMES.slice(leftIndex + 1).map((right) => ({
    name: `transition_${left}_${right}.png`, tileX: false, tileY: true, alphaVariation: true, width: 256, height: 256,
  }))
));
const spriteNames = [
  'sprite_industrial_breakable_edge.png',
  'sprite_industrial_cover_cluster.png',
  'sprite_industrial_linear_barrier.png',
  'sprite_scrap_landmark.png',
  'sprite_scrap_pile.png',
  'sprite_scrap_wreck_cluster.png',
  'sprite_site_entrance.png',
  'sprite_site_industrial_yard.png',
  'sprite_site_scrap_yard.png',
  'sprite_wasteland_cover.png',
  'sprite_wasteland_debris.png',
  'sprite_wasteland_landmark.png',
];
const spriteSpecs = spriteNames.map((name) => ({
  name, tileX: false, tileY: false, alphaVariation: true, maxBorderAlpha: 4, minDimension: 1024,
}));

const specs = [
  ...groundSpecs,
  ...transitionSpecs,
  { name: 'road_surface.png', tileX: false, tileY: true, alphaVariation: false },
  { name: 'road_edge.png', tileX: false, tileY: true, alphaVariation: true },
  ...spriteSpecs,
];

function edgeRms(png, axis) {
  let sum = 0;
  let count = 0;
  const length = axis === 'x' ? png.height : png.width;
  for (let value = 0; value < length; value++) {
    const first = axis === 'x' ? (value * png.width) * 4 : value * 4;
    const last = axis === 'x'
      ? (value * png.width + png.width - 1) * 4
      : ((png.height - 1) * png.width + value) * 4;
    for (let channel = 0; channel < 4; channel++) {
      const delta = png.data[first + channel] - png.data[last + channel];
      sum += delta * delta;
      count++;
    }
  }
  return Math.sqrt(sum / count);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function borderAlpha(png) {
  let maximum = 0;
  for (let x = 0; x < png.width; x++) {
    maximum = Math.max(maximum, png.data[x * 4 + 3]);
    maximum = Math.max(maximum, png.data[((png.height - 1) * png.width + x) * 4 + 3]);
  }
  for (let y = 0; y < png.height; y++) {
    maximum = Math.max(maximum, png.data[(y * png.width) * 4 + 3]);
    maximum = Math.max(maximum, png.data[(y * png.width + png.width - 1) * 4 + 3]);
  }
  return maximum;
}

const errors = [];
if (seedCoverage.seedStart !== 1 || seedCoverage.seedEnd !== 500) errors.push('seed-coverage-range-mismatch');
if (seedCoverage.missingCatalogClasses.length > 0) errors.push(`seed-coverage-missing:${seedCoverage.missingCatalogClasses.join(',')}`);
if (seedCoverage.unknownDemandClasses.length > 0) errors.push(`seed-coverage-unknown:${seedCoverage.unknownDemandClasses.join(',')}`);
for (const family of catalog.families) {
  if (!family.reserved && !seedCoverage.counts[family.demandClass]) errors.push(`seed-coverage-unobserved:${family.demandClass}`);
}
const files = [];
const checks = [];
for (const spec of specs) {
  const filePath = path.join(candidateDir, spec.name);
  if (!fs.existsSync(filePath)) {
    errors.push(`candidate-file-missing:${spec.name}`);
    continue;
  }
  const buffer = fs.readFileSync(filePath);
  const png = readPng(filePath);
  if (spec.width !== undefined && (png.width !== spec.width || png.height !== spec.height)) {
    errors.push(`candidate-invalid-dimensions:${spec.name}`);
  }
  if (spec.minDimension !== undefined && Math.min(png.width, png.height) < spec.minDimension) {
    errors.push(`candidate-too-small:${spec.name}:${png.width}x${png.height}`);
  }
  const rmsX = edgeRms(png, 'x');
  const rmsY = edgeRms(png, 'y');
  if (spec.tileX && rmsX > 1) errors.push(`candidate-x-seam:${spec.name}:${rmsX.toFixed(3)}`);
  if (spec.tileY && rmsY > 1) errors.push(`candidate-y-seam:${spec.name}:${rmsY.toFixed(3)}`);
  let minAlpha = 255, maxAlpha = 0;
  for (let index = 3; index < png.data.length; index += 4) {
    minAlpha = Math.min(minAlpha, png.data[index]);
    maxAlpha = Math.max(maxAlpha, png.data[index]);
  }
  if (spec.alphaVariation && maxAlpha - minAlpha < 32) errors.push(`candidate-alpha-range-too-small:${spec.name}`);
  if (!spec.alphaVariation && (minAlpha !== 255 || maxAlpha !== 255)) errors.push(`candidate-unexpected-alpha:${spec.name}`);
  const observedBorderAlpha = borderAlpha(png);
  if (spec.maxBorderAlpha !== undefined && observedBorderAlpha > spec.maxBorderAlpha) {
    errors.push(`candidate-border-alpha:${spec.name}:${observedBorderAlpha}`);
  }
  const relativePath = `style-kits/ironwaste-v1/candidates/${spec.name}`;
  files.push({ path: relativePath, sha256: sha256(buffer), width: png.width, height: png.height, format: 'png' });
  checks.push({ name: spec.name, rmsX: Number(rmsX.toFixed(3)), rmsY: Number(rmsY.toFixed(3)), minAlpha, maxAlpha, borderAlpha: observedBorderAlpha });
}

const qaImages = [
  { path: 'docs/superpowers/assets/ironwaste-v1-contact-sheet.png', width: 2048, height: 1840 },
  { path: 'docs/superpowers/assets/ironwaste-v1-seed-board.png', width: 1000, height: 840 },
  { path: 'docs/superpowers/assets/wasteland-v1-concept.png', width: 1254, height: 1254 },
];
for (const qa of qaImages) {
  const filePath = path.resolve(root, qa.path);
  if (!fs.existsSync(filePath)) {
    errors.push(`qa-image-missing:${qa.path}`);
    continue;
  }
  const png = readPng(filePath);
  if (png.width !== qa.width || png.height !== qa.height) errors.push(`qa-image-invalid-dimensions:${qa.path}`);
}

files.sort((a, b) => a.path.localeCompare(b.path));
checks.sort((a, b) => a.name.localeCompare(b.name));
errors.sort((a, b) => a.localeCompare(b));
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}

fs.mkdirSync(generatedDir, { recursive: true });
const manifest = {
  kitId: 'ironwaste-v1',
  kitVersion: 3,
  catalogSignature: catalog.signature,
  state: approve ? 'approved' : 'candidate',
  files,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const report = [
  '# Ironwaste v1 Asset QA',
  '',
  `- Catalog signature: \`${catalog.signature}\``,
  '- Kit version: `3`',
  `- State: \`${manifest.state}\``,
  '- Activation: `preview`',
  '- Preview biomes: `industrial`, `scrap`, `wasteland`, `mud`, `ruins`, `crater`',
  `- Seed coverage: \`${seedCoverage.seedStart}..${seedCoverage.seedEnd}\``,
  `- Seed coverage signature: \`${seedCoverage.signature}\``,
  '- Wasteland style reference: `docs/superpowers/assets/wasteland-v1-concept.png`',
  '',
  '| File | X-edge RMS | Y-edge RMS | Alpha range | Border alpha | SHA-256 |',
  '| --- | ---: | ---: | --- | ---: | --- |',
  ...checks.map((check) => {
    const file = files.find((entry) => entry.path.endsWith(`/${check.name}`));
    return `| ${check.name} | ${check.rmsX} | ${check.rmsY} | ${check.minAlpha}–${check.maxAlpha} | ${check.borderAlpha} | \`${file.sha256}\` |`;
  }),
  '',
  '## Generator demand frequencies',
  '',
  '| Demand class | Occurrences in 500 seeds |',
  '| --- | ---: |',
  ...Object.entries(seedCoverage.counts).map(([demandClass, count]) => `| \`${demandClass}\` | ${count} |`),
  '',
  '- Missing catalog classes: **0**',
  '- Unknown emitted classes: **0**',
  '',
  'Unrestricted runtime activation remains blocked until the complete non-reserved catalog is covered.',
  '',
].join('\n');
fs.writeFileSync(path.join(generatedDir, 'ironwaste-v1-qa.md'), report, 'utf8');

process.stdout.write(`ironwaste-verified:${manifest.state}:${files.length}:${catalog.signature}\n`);
