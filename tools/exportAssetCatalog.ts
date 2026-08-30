import fs from 'node:fs';
import path from 'node:path';
import { REQUIRED_ASSET_CATALOG } from '../src/world/map/assetDemandCompiler';

const outputDir = path.resolve(process.cwd(), 'docs/generated');
fs.mkdirSync(outputDir, { recursive: true });

const jsonPath = path.join(outputDir, 'required-asset-catalog.json');
fs.writeFileSync(jsonPath, `${JSON.stringify(REQUIRED_ASSET_CATALOG, null, 2)}\n`, 'utf8');

const rows = REQUIRED_ASSET_CATALOG.families.map((family) => (
  `| \`${family.demandClass}\` | ${family.source} | ${family.geometryMode} | ${family.biomes.join(', ')} | ${family.requiredVariants} | ${family.requiredStates.join(', ')} | ${family.connectorProfiles.join(', ')} | ${family.reserved ? 'yes' : 'no'} |`
));
const markdown = [
  '# Required Asset Catalog',
  '',
  `- Generator version: \`${REQUIRED_ASSET_CATALOG.generatorVersion}\``,
  `- Catalog signature: \`${REQUIRED_ASSET_CATALOG.signature}\``,
  `- Required families: **${REQUIRED_ASSET_CATALOG.families.length}**`,
  '',
  '| Demand class | Source | Geometry | Biomes | Variants | States | Connectors | Reserved |',
  '| --- | --- | --- | --- | ---: | --- | --- | --- |',
  ...rows,
  '',
].join('\n');
fs.writeFileSync(path.join(outputDir, 'required-asset-catalog.md'), markdown, 'utf8');

process.stdout.write(`asset-catalog:${REQUIRED_ASSET_CATALOG.signature}:${REQUIRED_ASSET_CATALOG.families.length}\n`);
