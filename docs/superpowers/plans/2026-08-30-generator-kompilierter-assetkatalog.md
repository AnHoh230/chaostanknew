# Generator-Compiled Asset Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generator-derived asset-demand catalog, validate coherent WorldStyleKits against it, and produce the first deterministic Industrie–Schrott candidate family with technical and visual QA artifacts.

**Architecture:** The existing spatial generator remains authoritative and emits semantic `demandClass` values. A pure compiler derives the complete required catalog from the closed generator grammar; a separate kit validator and resolver accept only compatible families from one style kit. Offline tooling exports the catalog and generates deterministic candidate textures plus a contact sheet without introducing runtime asset fallbacks.

**Tech Stack:** TypeScript 5.6, Vitest 2.1, Babylon.js 8, Vite 6, Node.js ESM tools, `pngjs` 7.

**Spec:** `docs/superpowers/specs/2026-08-30-generator-kompilierter-assetkatalog-design.md`

## Global Constraints

- The spatial pipeline remains `WorldDNA -> fields -> regions -> sites -> graph -> routed corridors -> reservations -> landscape`.
- Generator grammar, never observed seeds, is the source of required asset demand.
- A run uses exactly one `WorldStyleKit`; families from different kits may not be mixed.
- Geometry and collision envelopes remain authoritative and may not grow during visual resolution.
- No legacy generator, primitive runtime fallback, cross-kit fallback, or on-demand image generation during a run.
- The Industrie–Schrott kit begins in `preview` activation state and cannot be selected for unrestricted runtime worlds until full catalog coverage passes.
- Candidate assets require deterministic technical validation and a visual contact sheet before approval metadata may mark them `approved`.

---

## File Structure

### New runtime/domain files

- `src/world/map/assetDemandTypes.ts`: asset-demand, connector, family, style-kit, coverage, and candidate-manifest contracts.
- `src/world/map/generatorCapabilitySpec.ts`: closed capability grammar assembled from landscape recipes plus ground, transition, corridor, junction, and site rules.
- `src/world/map/assetDemandCompiler.ts`: pure canonical catalog compiler and stable signature.
- `src/world/map/worldAssetDemands.ts`: derives concrete per-world demand occurrences for reporting and resolution.
- `src/world/map/worldStyleKit.ts`: kit validation, preview/runtime activation gates, and deterministic family lookup.
- `src/world/map/ironwasteStyleKit.ts`: first coherent Industrie–Schrott preview kit metadata.
- `src/world/map/assetCoverage.ts`: mathematical catalog coverage and empirical seed-frequency reporting.
- `src/world/map/assetCandidateManifest.ts`: candidate hashes, approval state, and technical metadata validation.

### Modified runtime/domain files

- `src/world/map/worldTypes.ts`: add the closed `DemandClassId` union and `LandscapeFeature.demandClass`.
- `src/world/map/landscapeGrammar.ts`: assign a demand class and required variant count to every pattern.
- `src/world/map/landscapeGenerator.ts`: copy the pattern demand class into emitted features.
- `src/world/map/worldGenerator.test.ts`: assert every emitted demand class is declared.
- `package.json`: add catalog export, asset generation, and asset verification scripts.

### New developer tools and generated artifacts

- `tools/exportAssetCatalog.ts`: exports canonical JSON and Markdown through `vite-node`.
- `tools/generateIronwasteAssets.mjs`: deterministic PNG generation for the candidate family.
- `tools/renderIronwasteSeedBoard.ts`: renders four real generated worlds into a top-down visual QA board with the candidate palette and textures.
- `tools/verifyIronwasteAssets.mjs`: dimensions, edge continuity, alpha, manifest hashes, and contact-sheet checks.
- `public/style-kits/ironwaste-v1/candidates/`: generated candidate PNG files and manifest.
- `docs/superpowers/assets/ironwaste-v1-contact-sheet.png`: visual QA sheet.
- `docs/superpowers/assets/ironwaste-v1-seed-board.png`: four full generated seed previews.
- `docs/generated/required-asset-catalog.json`: generated canonical catalog.
- `docs/generated/required-asset-catalog.md`: readable coverage requirements.

---

### Task 1: Closed demand vocabulary in landscape generation

**Files:**
- Modify: `src/world/map/worldTypes.ts`
- Modify: `src/world/map/landscapeGrammar.ts`
- Modify: `src/world/map/landscapeGenerator.ts`
- Modify: `src/world/map/landscapeGrammar.test.ts`
- Modify: `src/world/map/landscapeGenerator.test.ts`

**Interfaces:**
- Produces: `DemandClassId`, `LandscapeFeature.demandClass`, `LandscapePattern.demandClass`, `LandscapePattern.requiredVariants`.
- Consumes: existing `BiomeId`, `LandscapePattern`, and `LandscapeFeature` contracts.

- [ ] **Step 1: Write failing grammar tests**

Add assertions that every pattern has a namespaced demand class matching its biome and a positive integer variant requirement:

```ts
for (const recipe of Object.values(LANDSCAPE_RECIPES)) {
  for (const pattern of recipe.patterns) {
    expect(pattern.demandClass.startsWith(recipe.biomeId + '.')).toBe(true);
    expect(Number.isInteger(pattern.requiredVariants)).toBe(true);
    expect(pattern.requiredVariants).toBeGreaterThan(0);
  }
}
```

Add an emission assertion:

```ts
const emission = emitLine(anchor, 0, LANDSCAPE_RECIPES.industrial.patterns[0]!, region, grid, rng);
expect(emission.features.every((feature) => feature.demandClass === 'industrial.linearBarrier')).toBe(true);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts`

Expected: TypeScript/test failures because `demandClass` and `requiredVariants` do not exist.

- [ ] **Step 3: Add the closed vocabulary**

Add to `worldTypes.ts`:

```ts
export type LandscapeDemandClassId =
  | 'wasteland.landmarkIsland'
  | 'wasteland.destructibleBlob'
  | 'wasteland.coverCluster'
  | 'scrap.landmarkIsland'
  | 'scrap.wreckCluster'
  | 'scrap.scrapPile'
  | 'industrial.linearBarrier'
  | 'industrial.coverCluster'
  | 'industrial.breakableEdge'
  | 'mud.clearingIsland'
  | 'mud.destructibleBlob'
  | 'mud.fillerCluster'
  | 'ruins.landmarkArc'
  | 'ruins.linearBarrier'
  | 'ruins.coverCluster'
  | 'crater.clearingIsland'
  | 'crater.boundaryArc'
  | 'crater.destructibleBlob';

export type DemandClassId = LandscapeDemandClassId
  | `ground.${BiomeId}`
  | 'ground.transition'
  | 'corridor.surface'
  | 'corridor.edge'
  | 'junction.degree3'
  | 'junction.degree4'
  | 'site.industrialYard'
  | 'site.scrapYard'
  | 'site.entrance';
```

Add `demandClass: LandscapeDemandClassId` and `requiredVariants: number` to `LandscapePattern`, pass both through the `p(...)` helper, and assign all 18 patterns explicitly. Add `demandClass: DemandClassId` to `LandscapeFeature` and copy it in the `feature(...)` factory.

- [ ] **Step 4: Run focused tests and confirm pass**

Run: `npm test -- src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts`

Expected: both test files pass.

- [ ] **Step 5: Commit the semantic generator output**

```bash
git add src/world/map/worldTypes.ts src/world/map/landscapeGrammar.ts src/world/map/landscapeGenerator.ts src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts
git commit -m "feat(map): semantische Assetanforderungen emittieren"
```

### Task 2: Generator capability spec and canonical catalog compiler

**Files:**
- Create: `src/world/map/assetDemandTypes.ts`
- Create: `src/world/map/generatorCapabilitySpec.ts`
- Create: `src/world/map/assetDemandCompiler.ts`
- Create: `src/world/map/assetDemandCompiler.test.ts`

**Interfaces:**
- Consumes: `LANDSCAPE_RECIPES`, `BiomeId`, `DemandClassId`, `Footprint`, `LandscapeRole`, `LandscapeShape`, `PlacementMode`, `TraversalType`.
- Produces: `GENERATOR_CAPABILITY_SPEC`, `compileRequiredAssetCatalog(spec)`, `REQUIRED_ASSET_CATALOG`.

- [ ] **Step 1: Write compiler tests**

Cover deterministic ordering, signature stability, landscape-rule derivation, ground coverage, parametric corridor demands, and contradiction rejection:

```ts
const first = compileRequiredAssetCatalog(GENERATOR_CAPABILITY_SPEC);
const second = compileRequiredAssetCatalog([...GENERATOR_CAPABILITY_SPEC].reverse());
expect(first).toEqual(second);
expect(first.signature).toMatch(/^[0-9a-f]{8}$/);
expect(first.families.map((family) => family.demandClass)).toContain('industrial.linearBarrier');
expect(first.families.map((family) => family.demandClass)).toContain('ground.industrial');
expect(first.families.find((family) => family.demandClass === 'corridor.surface')?.geometryMode)
  .toBe('parametric');
```

Construct two incompatible rules for the same demand class and expect `conflicting-capability-rule:industrial.linearBarrier`.

- [ ] **Step 2: Run compiler test and confirm failure**

Run: `npm test -- src/world/map/assetDemandCompiler.test.ts`

Expected: module resolution fails for the three new modules.

- [ ] **Step 3: Implement focused contracts**

Define:

```ts
export type AssetDemandSource = 'landscape' | 'ground' | 'transition' | 'corridor' | 'junction' | 'site';
export type AssetFamilyRole = 'surface' | 'edge' | 'structure' | 'obstacle' | 'cluster' | 'decal' | 'site';
export type AssetGeometryMode = 'bounded' | 'tileable' | 'parametric';
export type AssetState = 'intact' | 'damaged' | 'destroyed';

export interface AssetDemandRule {
  demandClass: DemandClassId;
  source: AssetDemandSource;
  familyRole: AssetFamilyRole;
  geometryMode: AssetGeometryMode;
  biomes: BiomeId[];
  minFootprint: Footprint;
  maxFootprint: Footprint;
  connectorProfiles: string[];
  requiredVariants: number;
  requiredStates: AssetState[];
  reserved: boolean;
}
```

Create the catalog contracts shown in the spec. Keep connectors as IDs in this task; exact port geometry belongs to family variants in Task 4.

- [ ] **Step 4: Build the capability spec from generator grammar**

Map every `LANDSCAPE_RECIPES` pattern into one bounded rule using the same size envelopes as `landscapeGenerator.scaleFor`:

```ts
const SIZE_ENVELOPES = {
  small: { min: { halfX: 1.5, halfZ: 1.5 }, max: { halfX: 5.5, halfZ: 5.5 } },
  medium: { min: { halfX: 3, halfZ: 3 }, max: { halfX: 9, halfZ: 9 } },
  large: { min: { halfX: 4.5, halfZ: 4.5 }, max: { halfX: 14, halfZ: 14 } },
} as const;
```

Append six tileable ground rules, one generic parametric transition rule, corridor surface/edge rules, degree-3/degree-4 junction rules, two reserved preview site rules, and a parametric site entrance rule.

- [ ] **Step 5: Implement canonical compilation**

Sort every array and every rule, reject duplicate demand classes whose canonical JSON differs, and hash the canonical family JSON with 32-bit FNV-1a:

```ts
function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
```

- [ ] **Step 6: Run compiler tests**

Run: `npm test -- src/world/map/assetDemandCompiler.test.ts`

Expected: all compiler tests pass.

- [ ] **Step 7: Commit the catalog compiler**

```bash
git add src/world/map/assetDemandTypes.ts src/world/map/generatorCapabilitySpec.ts src/world/map/assetDemandCompiler.ts src/world/map/assetDemandCompiler.test.ts
git commit -m "feat(map): Assetpflichtkatalog aus Grammatik kompilieren"
```

### Task 3: Per-world demand derivation and empirical coverage

**Files:**
- Create: `src/world/map/worldAssetDemands.ts`
- Create: `src/world/map/worldAssetDemands.test.ts`
- Create: `src/world/map/assetCoverage.ts`
- Create: `src/world/map/assetCoverage.test.ts`
- Modify: `src/world/map/worldGenerator.test.ts`

**Interfaces:**
- Consumes: `GenerierteWelt`, `REQUIRED_ASSET_CATALOG`.
- Produces: `deriveWorldAssetDemands(world)`, `measureSeedDemandCoverage(worlds, catalog)`.

- [ ] **Step 1: Write world-demand tests**

For a generated world assert:

```ts
const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 42);
const demands = deriveWorldAssetDemands(world);
expect(demands.some((entry) => entry.source === 'landscape')).toBe(true);
expect(demands.filter((entry) => entry.source === 'ground').map((entry) => entry.demandClass))
  .toEqual(expect.arrayContaining([...new Set(world.regions.biomeByCell.map((biome) => `ground.${biome}`))]));
expect(demands.filter((entry) => entry.demandClass === 'corridor.surface')).toHaveLength(world.corridors.length);
```

Assert every emitted occurrence maps to a catalog family, and that a 500-seed report is byte-stable.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/world/map/worldAssetDemands.test.ts src/world/map/assetCoverage.test.ts`

Expected: missing-module failures.

- [ ] **Step 3: Derive demands without changing geography**

Emit occurrences for:

- every `LandscapeFeature.demandClass`,
- every active biome ground,
- every unique neighboring biome pair as `ground.transition` with sorted pair parameters,
- every corridor surface and edge,
- every realized junction with degree 3 or 4,
- every Industrie or Schrott site as its preview site class,
- every site touched by a corridor as `site.entrance`.

Use stable IDs based on existing world IDs, never array-order-only random IDs.

- [ ] **Step 4: Implement empirical coverage**

Return sorted counts, observed footprint ranges, missing catalog classes, unknown emitted classes, and a stable signature. Do not add observed-only classes to the catalog.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/world/map/worldAssetDemands.test.ts src/world/map/assetCoverage.test.ts src/world/map/worldGenerator.test.ts`

Expected: all pass, including 500-seed stability within the existing 60-second test budget or a dedicated 120-second timeout.

- [ ] **Step 6: Commit demand reporting**

```bash
git add src/world/map/worldAssetDemands.ts src/world/map/worldAssetDemands.test.ts src/world/map/assetCoverage.ts src/world/map/assetCoverage.test.ts src/world/map/worldGenerator.test.ts
git commit -m "feat(map): Assetbedarf realer Welten auswerten"
```

### Task 4: WorldStyleKit validation and deterministic family resolution

**Files:**
- Create: `src/world/map/worldStyleKit.ts`
- Create: `src/world/map/worldStyleKit.test.ts`
- Create: `src/world/map/ironwasteStyleKit.ts`
- Create: `src/world/map/ironwasteStyleKit.test.ts`

**Interfaces:**
- Consumes: `RequiredAssetCatalog`, `AssetDemandOccurrence`, `DemandClassId`.
- Produces: `validateWorldStyleKit(kit, catalog)`, `resolveAssetFamily(kit, demand, visualSeed)`, `IRONWASTE_V1_PREVIEW_KIT`.

- [ ] **Step 1: Write validation and resolver tests**

Cover:

```ts
expect(validateWorldStyleKit(IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG).activation)
  .toBe('preview');
expect(() => validateWorldStyleKit({ ...IRONWASTE_V1_PREVIEW_KIT, activation: 'runtime' }, REQUIRED_ASSET_CATALOG))
  .toThrow(/runtime-kit-incomplete/);
expect(() => validateWorldStyleKit(crossKitFixture, REQUIRED_ASSET_CATALOG))
  .toThrow(/cross-kit-family/);
expect(resolveAssetFamily(kit, demand, 99)).toEqual(resolveAssetFamily(kit, demand, 99));
```

Add envelope and connector incompatibility cases.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/world/map/worldStyleKit.test.ts src/world/map/ironwasteStyleKit.test.ts`

Expected: missing-module failures.

- [ ] **Step 3: Implement style, family, variant, and port contracts**

Define concrete structures in `assetDemandTypes.ts`:

```ts
export interface AssetPort {
  id: string;
  kind: 'road' | 'gate' | 'wall' | 'building' | 'pipe' | 'yard';
  localX: number;
  localZ: number;
  outwardAngle: number;
  width: number;
  clearance: number;
  compatibleWith: string[];
}

export interface AssetVariant {
  id: string;
  familyId: string;
  footprint: Footprint;
  allowedRotations: 'any' | number[];
  ports: AssetPort[];
  files: string[];
}
```

Add `GlobalStyleContract`, `BiomeStyleKit`, `AssetFamily`, and `WorldStyleKit` exactly once in this shared contract file.

- [ ] **Step 4: Implement strict validation**

Reject duplicate family/variant IDs, cross-kit families, unfulfilled preview scope, incomplete runtime catalogs, catalog signature mismatch, envelope overflow, missing connectors, invalid rotations, and empty files. Return a sorted coverage result for valid preview kits.

- [ ] **Step 5: Declare the first preview kit**

Use one global style contract with fixed palette slots, 16 pixels per world unit, matte materials, shared rust language, and these preview families:

```text
ground.industrial
ground.scrap
ground.transition (industrial/scrap)
corridor.surface
corridor.edge
industrial.linearBarrier
industrial.coverCluster
industrial.breakableEdge
scrap.landmarkIsland
scrap.wreckCluster
scrap.scrapPile
site.industrialYard
site.scrapYard
site.entrance
```

Every bounded family has at least the `requiredVariants` declared by its corresponding capability rule.

- [ ] **Step 6: Implement stable resolution**

Filter within one kit by demand class, biome parameters, footprint, and connector requirements. Sort variants by ID and choose with a hash of `visualSeed + kit version + occurrence ID`; do not consume the geography RNG.

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- src/world/map/worldStyleKit.test.ts src/world/map/ironwasteStyleKit.test.ts`

```bash
git add src/world/map/assetDemandTypes.ts src/world/map/worldStyleKit.ts src/world/map/worldStyleKit.test.ts src/world/map/ironwasteStyleKit.ts src/world/map/ironwasteStyleKit.test.ts
git commit -m "feat(map): geschlossenes WorldStyleKit validieren"
```

### Task 5: Catalog export and deterministic candidate asset generation

**Files:**
- Create: `tools/exportAssetCatalog.ts`
- Create: `tools/generateIronwasteAssets.mjs`
- Create: `tools/renderIronwasteSeedBoard.ts`
- Create: `tools/verifyIronwasteAssets.mjs`
- Create: `src/world/map/assetCandidateManifest.ts`
- Create: `src/world/map/assetCandidateManifest.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `REQUIRED_ASSET_CATALOG`, `IRONWASTE_V1_PREVIEW_KIT`, PNG paths declared by variants.
- Produces: `docs/generated/required-asset-catalog.{json,md}`, candidate PNGs, `candidate-manifest.json`, and `docs/superpowers/assets/ironwaste-v1-contact-sheet.png`.

- [ ] **Step 1: Write candidate-manifest tests**

Cover canonical file ordering, SHA-256 validation, required 256x256 texture metadata, approval invalidation after a hash change, and rejection of a manifest whose kit/catalog IDs differ.

```ts
expect(validateCandidateManifest(manifest, kit, catalog)).toEqual({ valid: true, errors: [] });
expect(validateCandidateManifest(changedHashManifest, kit, catalog).errors)
  .toContain('candidate-hash-mismatch:ground_industrial.png');
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- src/world/map/assetCandidateManifest.test.ts`

Expected: missing-module failure.

- [ ] **Step 3: Implement manifest validation as a pure function**

The browser-side module validates metadata supplied by the offline verifier. It does not read the filesystem. Require `candidate` or `approved` state, exact kit ID/version/catalog signature, unique file paths, 64-character lowercase SHA-256 values, positive dimensions, and family coverage.

- [ ] **Step 4: Add the catalog exporter**

Use `vite-node` so the exporter imports the real TypeScript compiler rather than duplicating grammar data. Write sorted JSON and a Markdown table containing demand class, source, geometry mode, biomes, variants, states, and connectors.

Add scripts:

```json
"assets:catalog": "vite-node tools/exportAssetCatalog.ts",
"assets:preview": "vite-node tools/renderIronwasteSeedBoard.ts",
"assets:generate": "npm run assets:catalog && node tools/generateIronwasteAssets.mjs && npm run assets:preview",
"assets:verify": "node tools/verifyIronwasteAssets.mjs"
```

- [ ] **Step 5: Generate cohesive tileable PNG candidates**

Use `pngjs` with a fixed local RNG and periodic coordinate functions. Generate at least:

```text
ground_industrial.png
ground_scrap.png
transition_industrial_scrap.png
road_surface.png
road_edge.png
decal_industrial_cracks.png
decal_scrap_fragments.png
decal_shared_grime.png
```

All textures are 256x256 RGBA. Opposite edges of tileable files are copied from a shared periodic field, not post-hoc blurred. Use the kit palette: graphite, cold concrete, desaturated steel, oxidized orange, dark soil, and restrained cyan accents.

- [ ] **Step 6: Generate a deterministic contact sheet**

Compose labeled 256x256 swatches into a 1024-wide PNG. Include repeated 2x2 tiles for seam inspection, the Industrie–Schrott transition between both grounds, and the road over both grounds. The contact sheet is a QA artifact, not a runtime texture.

- [ ] **Step 7: Render a real-seed preview board**

Use `vite-node` to import `generiereWelt` and render seeds `17`, `42`, `1337`, and `9001` into four top-down panels. Rasterize actual region cells with the kit palette, actual smoothed corridor centerlines with the road palette, and actual `LandscapeFeature` envelopes with family-role colors. Label every panel with seed, active biomes, site count, and feature count. Write `docs/superpowers/assets/ironwaste-v1-seed-board.png`; do not mutate or simplify the generated worlds before drawing them.

- [ ] **Step 8: Implement offline verification**

Read each PNG with `pngjs`, verify exact dimensions and RGBA format, calculate SHA-256, compare opposite-edge RMS for tileable files against a fixed threshold, verify required alpha variation for transition/decals, verify both QA boards exist with the expected dimensions, write the sorted candidate manifest, and fail the process on any violation.

- [ ] **Step 9: Run generation and verification**

Run: `npm run assets:generate`

Run: `npm run assets:verify`

Expected: both exit 0; catalog JSON/Markdown, eight candidate PNGs, manifest, contact sheet, and four-seed board exist.

- [ ] **Step 10: Run manifest tests and commit**

Run: `npm test -- src/world/map/assetCandidateManifest.test.ts`

```bash
git add package.json package-lock.json tools/exportAssetCatalog.ts tools/generateIronwasteAssets.mjs tools/renderIronwasteSeedBoard.ts tools/verifyIronwasteAssets.mjs src/world/map/assetCandidateManifest.ts src/world/map/assetCandidateManifest.test.ts docs/generated public/style-kits/ironwaste-v1/candidates docs/superpowers/assets/ironwaste-v1-contact-sheet.png docs/superpowers/assets/ironwaste-v1-seed-board.png
git commit -m "feat(assets): Industrie-Schrott-Kandidatenfamilie erzeugen"
```

### Task 6: Asset QA report and generator coverage proof

**Files:**
- Create: `src/world/map/worldAssetAudit.test.ts`
- Create: `docs/generated/ironwaste-v1-qa.md`
- Modify: `tools/verifyIronwasteAssets.mjs`

**Interfaces:**
- Consumes: catalog, preview kit, candidate manifest, 500 generated worlds.
- Produces: stable hard-coverage and empirical-frequency evidence for the vertical slice.

- [ ] **Step 1: Write the 500-seed audit test**

Generate seeds 1 through 500 and assert:

```ts
const report = measureSeedDemandCoverage(worlds, REQUIRED_ASSET_CATALOG);
expect(report.unknownDemandClasses).toEqual([]);
expect(report.counts['corridor.surface']).toBeGreaterThan(0);
expect(report.counts['ground.transition']).toBeGreaterThan(0);
expect(report.counts['industrial.linearBarrier']).toBeGreaterThan(0);
expect(report.counts['scrap.wreckCluster']).toBeGreaterThan(0);
```

Validate the preview kit separately against only its declared preview scope and assert runtime activation remains rejected.

- [ ] **Step 2: Run audit test and confirm any missing derivation**

Run: `npm test -- src/world/map/worldAssetAudit.test.ts`

Expected before final wiring: failure identifying missing or mismatched demand occurrences; no timeout or nondeterminism.

- [ ] **Step 3: Correct grammar/report mismatches only at their source**

If the audit finds an unknown class, add or correct its capability rule. If a declared non-reserved class is unreachable, correct its generator mapping or mark only genuinely future site classes `reserved: true`. Do not make the empirical report mutate the catalog.

- [ ] **Step 4: Emit the QA Markdown report**

Extend the verifier to write:

- catalog signature,
- kit version and preview scope,
- candidate hashes,
- technical image checks,
- mathematical preview coverage,
- empirical demand counts for seeds 1..500,
- explicit statement that unrestricted runtime activation is intentionally blocked.

- [ ] **Step 5: Run the audit, generation, and verification twice**

Run twice:

```bash
npm test -- src/world/map/worldAssetAudit.test.ts
npm run assets:generate
npm run assets:verify
```

Expected: all runs pass and generated JSON, manifest, hashes, contact sheet, and QA Markdown are byte-identical across both runs.

- [ ] **Step 6: Commit the coverage proof**

```bash
git add src/world/map/worldAssetAudit.test.ts tools/verifyIronwasteAssets.mjs docs/generated/ironwaste-v1-qa.md
git commit -m "test(assets): Assetkatalog und Kandidatenfamilie auditieren"
```

### Task 7: Full verification and visual inspection

**Files:**
- Modify only files required by concrete failures found in this task.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–6.
- Produces: verified branch ready for integration.

- [ ] **Step 1: Run formatting and repository consistency checks**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 2: Run the complete unit/property suite**

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite production build pass; the existing Vite large-chunk warning is allowed.

- [ ] **Step 4: Regenerate and verify all asset artifacts**

Run: `npm run assets:generate && npm run assets:verify`

Expected: exit 0 and clean `git status` for generated artifacts.

- [ ] **Step 5: Inspect the contact sheet at original resolution**

Open `docs/superpowers/assets/ironwaste-v1-contact-sheet.png` and verify:

- repeated tiles have no visible hard seam,
- Industrie and Schrott are distinct but share palette and material language,
- road surface remains readable over both grounds,
- the transition reads as a gradual contaminated boundary,
- decals share scale and contrast.

Inspect `docs/superpowers/assets/ironwaste-v1-seed-board.png` and verify that the same style vocabulary remains legible across four structurally different worlds without changing their generated geometry.

If a visual defect exists, change the deterministic generator parameters, regenerate, rerun verification, and inspect again.

- [ ] **Step 6: Commit verification fixes if needed**

```bash
git add tools/generateIronwasteAssets.mjs tools/renderIronwasteSeedBoard.ts tools/verifyIronwasteAssets.mjs public/style-kits/ironwaste-v1/candidates docs/superpowers/assets/ironwaste-v1-contact-sheet.png docs/superpowers/assets/ironwaste-v1-seed-board.png docs/generated/ironwaste-v1-qa.md
git commit -m "fix(assets): visuelle Assetfamilie angleichen"
```

- [ ] **Step 7: Record final evidence**

Capture the final test count, build result, catalog signature, kit version, generated file count, and contact-sheet path in the handoff message.
