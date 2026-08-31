# Generator Visible Demand Contract – Implementation Plan

> **Goal:** Make every semantic occurrence produced by the world generator visible in the AssetLab, add complete biome-site demands, and let WorldFields produce environmental occurrences.

**Architecture:** The generated world remains the only source of spatial truth. A placement compiler maps every derived demand occurrence one-to-one to either an approved asset or a diagnostic missing marker. Environmental content is generated before placement compilation and is therefore part of world validation and deterministic signatures.

**Tech Stack:** TypeScript, Babylon.js, Vitest, Vite.

---

## Task 1: One-to-one demand placement contract

**Files:**

- Modify: `src/world/map/worldAssetPlacement.ts`
- Modify: `src/world/map/worldAssetPlacement.test.ts`
- Modify: `src/world/map/assetDemandTypes.ts`

1. Add failing tests proving that each demand target produces exactly one placement, even outside the preview scope.
2. Add a discriminated `resolved | missing` asset union. A missing asset stores the demand class, catalog role, geometry mode, footprint and diagnostic reason, but no files or family id.
3. Remove silent `omitted` output from the placement plan.
4. Resolve in-scope families through the approved manifest and compile all other targets to missing placements.
5. Run:

   ```powershell
   npx vitest run src/world/map/worldAssetPlacement.test.ts
   ```

## Task 2: Diagnostic rendering and honest AssetLab statistics

**Files:**

- Modify: `src/world/map/worldStylePreviewRenderer.ts`
- Modify: `src/world/map/worldStylePreviewRenderer.test.ts`
- Modify: `src/world/map/assetLabModel.ts`
- Modify: `src/world/map/assetLabAcceptance.test.ts`
- Modify: `src/assetLab.ts`
- Modify: `asset-lab.html`

1. Add failing tests requiring mesh names beginning with `style_missing_` for missing placements and real sprite/texture meshes for resolved placements.
2. Render diagnostic-only magenta geometry from the generator footprint:
   - flat surface for ground-like occurrences,
   - ribbon/edge marker for corridor-like occurrences,
   - cylinder for junctions,
   - raised wireframe box for bounded landscape and site occurrences.
3. Ensure diagnostic geometry is only reachable through `asset.status === 'missing'`.
4. Replace omitted statistics with total, resolved and missing placements plus a missing-by-class list.
5. Mark the Lab as incomplete while missing classes exist; do not describe missing content as preview scope.
6. Run:

   ```powershell
   npx vitest run src/world/map/worldStylePreviewRenderer.test.ts src/world/map/assetLabAcceptance.test.ts
   ```

## Task 3: One site occurrence for every generated site

**Files:**

- Modify: `src/world/map/worldTypes.ts`
- Modify: `src/world/map/worldAssetPlacement.ts`
- Modify: `src/world/map/worldAssetDemands.test.ts`
- Modify: `src/world/map/generatorCapabilitySpec.ts`
- Modify: `src/world/map/assetDemandCompiler.test.ts`

1. Add failing coverage for all six biome-to-site mappings.
2. Add the four missing site demand classes to `DemandClassId`.
3. Replace the partial site switch with an exhaustive biom mapping.
4. Compile the new semantic classes into the generator capability spec and required asset catalog.
5. Assert that every generated site id has exactly one `kind: 'site'` placement in addition to entrance placements.
6. Run:

   ```powershell
   npx vitest run src/world/map/worldAssetDemands.test.ts src/world/map/worldAssetPlacement.test.ts src/world/map/assetDemandCompiler.test.ts
   ```

## Task 4: WorldField-driven environmental occurrences

**Files:**

- Create: `src/world/map/fieldEnvironmentGrammar.ts`
- Create: `src/world/map/fieldEnvironmentGenerator.ts`
- Create: `src/world/map/fieldEnvironmentGenerator.test.ts`
- Modify: `src/world/map/worldTypes.ts`
- Modify: `src/world/map/worldGenerator.ts`
- Modify: `src/world/map/generatorCapabilitySpec.ts`
- Modify: `src/world/map/worldGenerator.test.ts`
- Modify: `src/world/map/worldValidator.ts`

1. Write fixture-based failing tests for dry brush, wet brush and rock outcrop candidate selection, determinism, bounds, spacing and hard-reservation exclusion.
2. Define data-only field rules containing allowed biomes, thresholds, footprint range, traversal, role and minimum spacing.
3. Generate deterministic `LandscapeFeature` occurrences from the field grid after the existing landscape stage.
4. Scale candidate limit with structural density and keep spatial choices independent from asset availability.
5. Append occurrences to `world.features` before validation and include the rules in the generator capability specification.
6. Run:

   ```powershell
   npx vitest run src/world/map/fieldEnvironmentGenerator.test.ts src/world/map/worldGenerator.test.ts src/world/map/worldValidator.test.ts
   ```

## Task 5: Catalog regeneration and integration verification

**Files:**

- Modify generated catalog documents produced by `tools/exportAssetCatalog.ts`
- Modify the approved candidate manifest only through the repository approval command if its catalog signature changes

1. Regenerate the asset catalog:

   ```powershell
   npm run assets:catalog
   npm run assets:approve
   ```

2. Run focused world and asset tests:

   ```powershell
   npx vitest run src/world/map/assetCoverage.test.ts src/world/map/assetKit.test.ts src/world/map/ironwasteStyleKit.test.ts src/world/map/worldAssetAudit.test.ts
   ```

3. Run the full suite:

   ```powershell
   npm test
   npm run assets:verify
   npm run build
   ```

4. Start Vite, open `/asset-lab.html`, inspect at least three seeds and verify:
   - no generated occurrence disappears,
   - real road, ground, scrap and industry families still render,
   - missing site and environment families are clearly visible,
   - missing counts update with the seed.

5. Review the diff, commit the implementation, merge the branch into `master` without touching unrelated dirty user files, and push `origin/master`.
