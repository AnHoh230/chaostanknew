import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readPng } from './pngDrawing.mjs';

const root = process.cwd();
const candidateDir = path.resolve(root, 'public/style-kits/ironwaste-v1/candidates');
const generatedDir = path.resolve(root, 'docs/generated');
const catalog = JSON.parse(fs.readFileSync(path.join(generatedDir, 'required-asset-catalog.json'), 'utf8'));
const seedCoverage = JSON.parse(fs.readFileSync(path.join(generatedDir, 'asset-seed-coverage.json'), 'utf8'));
const approve = process.argv.includes('--approve');

const specs = [
  { name: 'ground_industrial.png', tileX: true, tileY: true, alphaVariation: false },
  { name: 'ground_scrap.png', tileX: true, tileY: true, alphaVariation: false },
  { name: 'transition_industrial_scrap.png', tileX: false, tileY: true, alphaVariation: true },
  { name: 'road_surface.png', tileX: false, tileY: true, alphaVariation: false },
  { name: 'road_edge.png', tileX: false, tileY: true, alphaVariation: true },
  { name: 'decal_industrial_cracks.png', tileX: true, tileY: true, alphaVariation: true },
  { name: 'decal_scrap_fragments.png', tileX: true, tileY: true, alphaVariation: true },
  { name: 'decal_shared_grime.png', tileX: true, tileY: true, alphaVariation: true },
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
  if (png.width !== 256 || png.height !== 256) errors.push(`candidate-invalid-dimensions:${spec.name}`);
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
  const relativePath = `style-kits/ironwaste-v1/candidates/${spec.name}`;
  files.push({ path: relativePath, sha256: sha256(buffer), width: png.width, height: png.height, format: 'png' });
  checks.push({ name: spec.name, rmsX: Number(rmsX.toFixed(3)), rmsY: Number(rmsY.toFixed(3)), minAlpha, maxAlpha });
}

const qaImages = [
  { path: 'docs/superpowers/assets/ironwaste-v1-contact-sheet.png', width: 1024, height: 1024 },
  { path: 'docs/superpowers/assets/ironwaste-v1-seed-board.png', width: 1000, height: 840 },
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
  kitVersion: 1,
  catalogSignature: catalog.signature,
  state: approve ? 'approved' : 'candidate',
  files,
};
fs.writeFileSync(path.join(candidateDir, 'candidate-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const report = [
  '# Ironwaste v1 Asset QA',
  '',
  `- Catalog signature: \`${catalog.signature}\``,
  '- Kit version: `1`',
  `- State: \`${manifest.state}\``,
  '- Activation: `preview`',
  `- Seed coverage: \`${seedCoverage.seedStart}..${seedCoverage.seedEnd}\``,
  `- Seed coverage signature: \`${seedCoverage.signature}\``,
  '',
  '| File | X-edge RMS | Y-edge RMS | Alpha range | SHA-256 |',
  '| --- | ---: | ---: | --- | --- |',
  ...checks.map((check) => {
    const file = files.find((entry) => entry.path.endsWith(`/${check.name}`));
    return `| ${check.name} | ${check.rmsX} | ${check.rmsY} | ${check.minAlpha}–${check.maxAlpha} | \`${file.sha256}\` |`;
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
