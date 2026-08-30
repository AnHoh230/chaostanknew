import fs from 'node:fs';
import path from 'node:path';
import { REQUIRED_ASSET_CATALOG } from '../src/world/map/assetDemandCompiler';
import { createAssetCoverageAccumulator } from '../src/world/map/assetCoverage';
import { DEFAULT_WORLD_OPTIONS, generiereWelt } from '../src/world/map/worldGenerator';

const seedStart = 1;
const seedEnd = 500;
const accumulator = createAssetCoverageAccumulator(REQUIRED_ASSET_CATALOG);
for (let seed = seedStart; seed <= seedEnd; seed++) {
  accumulator.addWorld(generiereWelt(DEFAULT_WORLD_OPTIONS, seed));
}
const report = accumulator.report();
const summary = {
  seedStart,
  seedEnd,
  signature: report.signature,
  counts: report.counts,
  missingCatalogClasses: report.missingCatalogClasses,
  unknownDemandClasses: report.unknownDemandClasses,
};
const outputDir = path.resolve(process.cwd(), 'docs/generated');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'asset-seed-coverage.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
process.stdout.write(`asset-seed-coverage:${seedStart}-${seedEnd}:${report.signature}\n`);
