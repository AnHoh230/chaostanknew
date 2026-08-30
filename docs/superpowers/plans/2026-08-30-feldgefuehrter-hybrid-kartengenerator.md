# Feldgefuehrter Hybrid-Kartengenerator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bisherigen Modul-/Scatter-Kartengenerator vollstaendig durch einen deterministischen feldgefuehrten Hybridgenerator mit Graybox-Runtime ersetzen.

**Architecture:** Reine Stufen erzeugen WorldDNA, Makrostruktur, Felder, Regionen, Sites, einen landschaftsbewussten Intent-Graph, breitebewusste Korridore, die realisierte Fahr-Topologie, Reservations und lokale Landschaftsfeatures. `generiereWelt` endet am validierten abstrakten Weltmodell; `resolveGraybox` projiziert es separat in die Babylon-Laufzeit.

**Tech Stack:** TypeScript 5.6 strict, Vitest 2.1, Vite 6, BabylonJS 8, keine neue Runtime-Abhaengigkeit.

**Spec:** `docs/superpowers/specs/2026-08-29-feldgefuehrter-hybrid-kartengenerator-design.md`

## Global Constraints

- Kein Legacy-Modus, kein Generator-Umschalter, kein alter Fallback und kein Seed-Neuwuerfeln.
- Weltkoordinaten: X `[-400,+400]`, Z `[-320,+320]`, Spawn `(0,0)`.
- FieldGrid: `80 x 64` mit `10` Welteinheiten; TraversalGrid: `160 x 128` mit `5` Welteinheiten.
- Kontinuierliche Felder werden bilinear, kategoriale Daten ueber die enthaltende Zelle gesampelt.
- Der Generator bleibt Engine-frei; Babylon-Code konsumiert nur die Runtime-Projektion.
- Jede Stufe ist rein, deterministisch und besitzt einen gelabelten RNG-Strom.
- `worldValidator` liest nur. Stufeneigene Normalisierung bleibt in der verantwortlichen Stufe.
- Der Intent-Graph hat einen harten maximalen Site-Grad von 4.
- Korridorbreite und Clearance sind bereits Teil der A*-Begehbarkeit.
- Gameplayrelevante Geometrie entsteht nie durch einen allgemeinen Scatter-Aufruf.
- Bestehende nicht zu dieser Arbeit gehoerende Worktree-Aenderungen werden nicht angefasst oder committed.

---

## File Structure

Neue reine Generatordateien unter `src/world/map/`:

- `worldTypes.ts`: alle abstrakten Welt-, Grid-, Graph-, Feature- und Diagnosevertraege.
- `worldGrid.ts`: Gridindexierung, Koordinatenumrechnung, Nachbarn und Sampling.
- `seedStreams.ts`: stabiler Label-Hash und getrennte RNG-Stroeme.
- `worldDNA.ts`: DNA und Debug-Overrides.
- `macroStructure.ts`: Hauptachse und zwei bis vier Makroeinfluesse.
- `worldFields.ts`: vier Grundfelder, Potentiale und Sampling.
- `regionGenerator.ts`: aktive Biome, Keime, Wachstum, Oednisrest und Regionsnormalisierung.
- `siteGenerator.ts`: Spawn und sechs bis zehn weitere Sites mit Zugangsband.
- `traversalGraph.ts`: grobe Terrainkosten, gradbegrenzter Spannbaum und Zusatzkanten.
- `pathRouter.ts`: breitebewusstes A* auf dem TraversalGrid und `RoutedCorridor`.
- `realizedTraversalGraph.ts`: Sites, Kreuzungen und reale Korridorsegmente.
- `siteRoleResolver.ts`: unabhaengige Topologie-Tags.
- `spatialReservations.ts`: Spawn-, Site-, Korridor-, Junction- und Clearing-Reservations.
- `landscapeGrammar.ts`: Feature- und Assetarchetypen sowie Biomrezepte.
- `landscapeGenerator.ts`: regelbasierte Komposition von gross nach klein.
- `worldValidator.ts`: lesende harte Invarianten und neutrale Qualitaetsmetriken.
- `worldGenerator.ts`: Orchestrator und `WorldGenerationError`.
- `runtimeMap.ts`: schmales, generatorunabhaengiges Runtimeformat.
- `grayboxResolver.ts`: deterministische Projektion von Features auf Primitive/Assets.
- `regionGroundData.ts`: reine Geometriedaten fuer Biomflaechen.
- `regionGround.ts`: Babylon-Renderer fuer die Biomflaechen.
- `worldDebugProjection.ts`: reine Mapsmith-Debugprojektion.

Geaenderte Dateien:

- `mapTypes.ts`: nur gemeinsam benoetigte Vektoren und Runtime-Entities; alte Zonen-/Pfadwelt entfernen.
- `assetKit.ts`: Asset-Grammatik statt alter `ZoneTheme`-Bindung.
- `loader.ts` und `loader.test.ts`: `RuntimeKarte` konsumieren.
- `roadMesh.ts`: aus `RoutedCorridor` renderbare Centerline-Zellen ableiten.
- `mapsmith.ts`, `mapsmith.test.ts`, `mapsmithHud.ts`: Hybrid-ID und Debugprojektion.
- `main.ts`: ausschliesslich neue Weltgenerierung und Runtimeprojektion verwenden.
- `mapTuning.ts`: Generator-spezifische Altwerte entfernen; Gameplaywerte behalten.

Entfernte Altdateien nach erfolgreicher Integration:

- `cityGen.ts`, `cityGen.test.ts`
- `generator.ts`, `generator.test.ts`
- `modulePlacement.ts`, `modulePlacement.test.ts`
- `moduleRoads.ts`, `moduleRoads.test.ts`
- `moduleStamp.ts`
- `moduleKatalog.ts`, `moduleKatalog.test.ts`
- `moduleCaps.ts`
- `muster.ts`, `muster.test.ts`
- `groundTiles.ts`
- `validator.ts`
- `recipe.ts`, `recipe.test.ts`

---

### Task 1: Weltvertraege, Raster und RNG-Stroeme

**Files:**
- Create: `src/world/map/worldTypes.ts`
- Create: `src/world/map/worldGrid.ts`
- Create: `src/world/map/worldGrid.test.ts`
- Create: `src/world/map/seedStreams.ts`
- Create: `src/world/map/seedStreams.test.ts`

**Interfaces:**
- Produces: `Extents`, `GridSpec`, `GridCell`, `BiomeId`, IDs, `WorldDNA`, `MacroStructure`, `WorldFields`, `RegionMap`, `Site`, Graph-/Korridor-/Reservation-/Featuretypen.
- Produces: `createGridSpec`, `cellIndex`, `cellAtWorld`, `cellCenter`, `neighbors4`, `sampleContinuous`, `sampleCategorical`, `seedForStream`, `createSeedStream`.

Define the shared top-level contracts exactly once in `worldTypes.ts`:

```ts
export type BiomeId = 'wasteland' | 'scrap' | 'industrial' | 'mud' | 'ruins' | 'crater';
export interface Extents { halfX: number; halfZ: number }
export interface GridSpec { cols: number; rows: number; cellSize: number; extents: Extents }
export interface WorldValidation { hardFailures: ValidationFailure[] }
export interface WorldQualityMetrics { signature: string; composedRatio: number; maxUncomposedArea: number; longestCorridorWithoutNode: number }
export interface WorldDebugData {
  validation: WorldValidation;
  quality: WorldQualityMetrics;
  fieldStats: Record<string, { min: number; max: number; mean: number }>;
  selectedCandidates: Record<string, number[]>;
}
export interface WorldGenerationOptions {
  extents: Extents;
  fieldGrid: GridSpec;
  traversalGrid: GridSpec;
  corridorWidth: number;
  corridorClearance: number;
  maxSiteDegree: 4;
  dnaOverride?: Partial<WorldDNA>;
}
```

Every helper whose name ends in `Fixture` in later snippets is a local, typed test factory in that test file. It returns explicit arrays and objects of the production contracts above; it must not add production-only test hooks.

- [ ] **Step 1: Write the failing grid and stream tests**

```ts
it('maps centered world coordinates to both grids', () => {
  expect(cellAtWorld(FIELD_GRID, { x: -399.9, z: -319.9 })).toEqual({ col: 0, row: 0, index: 0 });
  expect(cellAtWorld(FIELD_GRID, { x: 0, z: 0 })?.index).toBe(32 * 80 + 40);
  expect(cellCenter(FIELD_GRID, 0)).toEqual({ x: -395, z: -315 });
});

it('interpolates continuous values but never category ids', () => {
  const values = new Float32Array([0, 1, 0, 1]);
  expect(sampleContinuous(createGridSpec(2, 2, 10), values, { x: 0, z: 0 })).toBeCloseTo(0.5);
  expect(sampleCategorical(createGridSpec(2, 2, 10), ['a', 'b', 'c', 'd'], { x: 4, z: 4 })).toBe('d');
});

it('keeps labeled streams stable and independent', () => {
  expect(seedForStream(927361, 'fields')).toBe(seedForStream(927361, 'fields'));
  expect(seedForStream(927361, 'fields')).not.toBe(seedForStream(927361, 'sites'));
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- --run src/world/map/worldGrid.test.ts src/world/map/seedStreams.test.ts`

Expected: FAIL because both modules do not exist.

- [ ] **Step 3: Implement the minimal contracts and helpers**

```ts
export const WORLD_EXTENTS = { halfX: 400, halfZ: 320 } as const;
export const FIELD_GRID = createGridSpec(80, 64, 10);
export const TRAVERSAL_GRID = createGridSpec(160, 128, 5);

export function seedForStream(seed: number, label: SeedStreamLabel): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
```

Implement `sampleContinuous` with four FieldGrid samples and bilinear weights. Implement `sampleCategorical` through the containing cell only. Export labels `dna`, `macro`, `fields`, `regions`, `sites`, `graph`, `routing`, `landscape`, `visuals` as a closed union.

- [ ] **Step 4: Run focused tests and the TypeScript build**

Run: `npm test -- --run src/world/map/worldGrid.test.ts src/world/map/seedStreams.test.ts`

Expected: all focused tests PASS.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldTypes.ts src/world/map/worldGrid.ts src/world/map/worldGrid.test.ts src/world/map/seedStreams.ts src/world/map/seedStreams.test.ts
git commit -m "feat(map): Weltgrid und stabile RNG-Stroeme einfuehren"
```

### Task 2: WorldDNA und MacroStructure

**Files:**
- Create: `src/world/map/worldDNA.ts`
- Create: `src/world/map/worldDNA.test.ts`
- Create: `src/world/map/macroStructure.ts`
- Create: `src/world/map/macroStructure.test.ts`

**Interfaces:**
- Consumes: `WorldDNA`, `GridSpec`, `Extents`, `Rng`.
- Produces: `generateWorldDNA(seed, override?): WorldDNA`.
- Produces: `generateMacroStructure(dna, grid, rng): MacroStructure`.

- [ ] **Step 1: Write DNA and macro tests**

```ts
it('applies debug overrides without coupling the four base axes', () => {
  const dna = generateWorldDNA(7, { industrialization: 0.9, destruction: 0.2 });
  expect(dna.industrialization).toBe(0.9);
  expect(dna.destruction).toBe(0.2);
  expect(dna.openness).toBeGreaterThanOrEqual(0);
  expect(dna.openness).toBeLessThanOrEqual(1);
});

it('places two to four macro influences inside centered extents', () => {
  const macro = generateMacroStructure(generateWorldDNA(7), FIELD_GRID, createSeedStream(7, 'macro'));
  expect(macro.influences.length).toBeGreaterThanOrEqual(2);
  expect(macro.influences.length).toBeLessThanOrEqual(4);
  for (const i of macro.influences) {
    expect(Math.abs(i.center.x)).toBeLessThan(400);
    expect(Math.abs(i.center.z)).toBeLessThan(320);
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/worldDNA.test.ts src/world/map/macroStructure.test.ts`

Expected: FAIL because the generators do not exist.

- [ ] **Step 3: Implement DNA and macro selection**

Generate the four base axes directly from the `dna` stream. Derive `axisStrength`, `structuralDensity`, `targetRegionScale`, `roadDensity`, and `clusterStrength` with clamped formulas. Apply overrides last.

Build nine jittered candidate centers from a 3-by-3 macro lattice. Select the first by DNA-weighted score and each further center by:

```ts
score = dnaFit * 0.5 + normalizedDistanceFromSelected * 0.3 + axisAlignment * 0.2;
```

Return a main axis angle in `[0, 2*PI)` and anisotropic influence radii.

- [ ] **Step 4: Verify GREEN and determinism**

Run: `npm test -- --run src/world/map/worldDNA.test.ts src/world/map/macroStructure.test.ts`

Expected: PASS, including equal outputs for repeated seeds and unequal outputs for seeds 7 and 8.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldDNA.ts src/world/map/worldDNA.test.ts src/world/map/macroStructure.ts src/world/map/macroStructure.test.ts
git commit -m "feat(map): WorldDNA und Makrostruktur erzeugen"
```

### Task 3: Grundfelder und abgeleitete Potentiale

**Files:**
- Create: `src/world/map/worldFields.ts`
- Create: `src/world/map/worldFields.test.ts`

**Interfaces:**
- Consumes: `WorldDNA`, `MacroStructure`, `GridSpec`, `Rng`.
- Produces: `generateWorldFields(...): WorldFields`.
- Produces: `derivePotentials(fields, dna): DerivedPotentials`.

- [ ] **Step 1: Write field behavior tests**

```ts
it('does not stretch a low-industrial world to industrial 1', () => {
  const low = fixtureFields({ industrialization: 0.05 });
  expect(Math.max(...low.industrial)).toBeLessThan(0.65);
});

it('derives potentials from the four causes', () => {
  const p = derivePotentials(singleCellFields({ openness: 0.2, industrial: 0.9, wetness: 0.1, destruction: 0.8 }), dnaFixture());
  expect(p.ruin[0]).toBeGreaterThan(p.mud[0]);
  expect(p.building[0]).toBeGreaterThan(0.4);
});

it('is deterministic for all typed arrays', () => {
  expect(serializeFields(generateFixture(91))).toBe(serializeFields(generateFixture(91)));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/worldFields.test.ts`

Expected: FAIL because `worldFields.ts` does not exist.

- [ ] **Step 3: Implement value noise, fBm and fields**

Implement lattice value noise from hashed integer coordinates. Normalize each octave sum only by the known amplitude sum:

```ts
function fbm01(x: number, z: number, seed: number): number {
  let sum = 0, amp = 1, ampSum = 0, freq = 1;
  for (let octave = 0; octave < 4; octave++) {
    sum += valueNoise01(x * freq, z * freq, seed + octave) * amp;
    ampSum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / ampSum;
}
```

Combine noise, DNA level and macro influences, then clamp. Never inspect generated array minima/maxima. Derive `scrap`, `building`, `ruin`, `mud`, and `crater` arrays with documented weighted formulas.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/world/map/worldFields.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldFields.ts src/world/map/worldFields.test.ts
git commit -m "feat(map): korrelierte Weltfelder und Potentiale erzeugen"
```

### Task 4: Aktive Biome und zusammenhaengende Regionen

**Files:**
- Create: `src/world/map/regionGenerator.ts`
- Create: `src/world/map/regionGenerator.test.ts`

**Interfaces:**
- Produces: `selectActiveBiomes(potentials): ActiveBiomeSelection`.
- Produces: `generateRegions(grid, fields, potentials, dna, rng): RegionMap`.
- Produces: `isRegionConnected(regionMap, regionId): boolean` for validation/tests.

- [ ] **Step 1: Write active-biome and contiguity tests**

```ts
it('activates the best special biome even below threshold and caps at four', () => {
  expect(selectActiveBiomes(relevanceFixture([0.2, 0.1, 0.05, 0.15, 0.12])).biomes).toEqual(['scrap']);
  expect(selectActiveBiomes(relevanceFixture([0.9, 0.8, 0.7, 0.6, 0.5])).biomes).toHaveLength(4);
});

it('uses wasteland only as the unclaimed remainder', () => {
  const map = generateRegionFixture(33);
  expect(map.seeds.every((s) => s.biomeId !== 'wasteland')).toBe(true);
  expect(map.biomeByCell).toContain('wasteland');
});

it('gives every connected component its own region id', () => {
  const map = generateRegionFixture(44);
  for (const r of map.regions) expect(isRegionConnected(map, r.id)).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/regionGenerator.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement selection, seeds and weighted growth**

Compute relevance as `0.7 * mean + 0.3 * p90`. Activate values at least `0.42`, ensure the best one, cap at four. Compute special-region target as `round(lerp(8, 3, dna.targetRegionScale))`, at least active-biome count.

Use a deterministic priority queue for multi-source growth. Add symmetric adjacency costs `0.1`, `0.4`, or `0.8`. Stop each special region at its deterministic area budget; assign all remaining cells to wasteland and flood-fill component IDs. Merge special islands below the configured minimum cell count into the best neighboring region inside this stage.

- [ ] **Step 4: Verify GREEN across 100 seeds**

Run: `npm test -- --run src/world/map/regionGenerator.test.ts`

Expected: PASS, including the test loop for seeds 1 through 100.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/regionGenerator.ts src/world/map/regionGenerator.test.ts
git commit -m "feat(map): Biome aktivieren und Regionen wachsen lassen"
```

### Task 5: Sites mit Zugangsvertrag

**Files:**
- Create: `src/world/map/siteGenerator.ts`
- Create: `src/world/map/siteGenerator.test.ts`

**Interfaces:**
- Produces: `generateSites(grid, fields, regions, dna, rng): Site[]`.
- Site fields: `id`, `center`, `radius`, `accessBand`, `regionId`, `biomeId`.

- [ ] **Step 1: Write site contract tests**

```ts
it('keeps spawn at the centered origin', () => {
  expect(generateSiteFixture(1)[0]).toMatchObject({ id: 'spawn', center: { x: 0, z: 0 } });
});

it('creates seven to eleven non-overlapping sites with access bands in bounds', () => {
  for (const site of generateSiteFixture(8)) {
    expect(Math.abs(site.center.x) + site.radius + site.accessBand).toBeLessThanOrEqual(400);
    expect(Math.abs(site.center.z) + site.radius + site.accessBand).toBeLessThanOrEqual(320);
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/siteGenerator.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement ranked candidate selection**

Rank FieldGrid cell centers by openness, distance to existing sites, distance to bounds, region coverage, and macro variation. Insert spawn first with radius `24` and accessBand `12`. Derive other counts from `structuralDensity`, radii in `[18,32]`, accessBand `10`, and a minimum edge-to-edge spacing of `35`. On rejection, take the next ranked candidate; never change the seed.

- [ ] **Step 4: Verify GREEN and 200-seed bounds**

Run: `npm test -- --run src/world/map/siteGenerator.test.ts`

Expected: PASS for seeds 1 through 200.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/siteGenerator.ts src/world/map/siteGenerator.test.ts
git commit -m "feat(map): raeumlich geeignete Sites erzeugen"
```

### Task 6: Terrainkosten und gradbegrenzter Intent-Graph

**Files:**
- Create: `src/world/map/traversalGraph.ts`
- Create: `src/world/map/traversalGraph.test.ts`

**Interfaces:**
- Produces: `buildTerrainCostGraph(sites, grid, fields, regions, routing): TerrainCostGraph`.
- Produces: `buildTraversalGraph(costGraph, roadDensity, maxDegree = 4): TraversalGraph`.

- [ ] **Step 1: Write graph tests**

```ts
it('prefers the longer geometric edge when its routed terrain cost is lower', () => {
  const costs = buildTerrainCostGraph(terrainBarrierFixture().sites, FIELD_GRID, terrainBarrierFixture().fields, terrainBarrierFixture().regions, DEFAULT_ROUTING);
  expect(costs.edge('a', 'c').cost).toBeLessThan(costs.edge('a', 'b').cost);
});

it('builds a connected bounded-degree tree plus the configured loops', () => {
  const graph = buildTraversalGraph(completeCostFixture(9), 0.5, 4);
  expect(isConnected(graph)).toBe(true);
  expect(Math.max(...degrees(graph))).toBeLessThanOrEqual(4);
  expect(graph.edges).toHaveLength(9 - 1 + 2);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/traversalGraph.test.ts`

Expected: FAIL because the graph module does not exist.

- [ ] **Step 3: Implement coarse A* and bounded tree search**

Use FieldGrid 4-neighbor A* for every Site pair with the central cost formula from the spec. Build the tree with deterministic best-first backtracking over sorted candidate edges. State contains DSU components, degrees, selected edges and accumulated cost. Prune states that exceed degree 4 or cannot connect remaining components. Select the minimum-cost complete tree.

Map road density exactly:

```ts
const extraEdges = roadDensity < 1 / 3 ? 1 : roadDensity < 2 / 3 ? 2 : 3;
```

Add cheapest remaining edges that preserve degree 4 and are not duplicates.

- [ ] **Step 4: Verify GREEN on adversarial stars and 100 seeds**

Run: `npm test -- --run src/world/map/traversalGraph.test.ts`

Expected: PASS, including a fixture whose unconstrained MST would have degree 8.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/traversalGraph.ts src/world/map/traversalGraph.test.ts
git commit -m "feat(map): landschaftsbewussten Intent-Graph bauen"
```

### Task 7: Breitebewusstes Routing

**Files:**
- Create: `src/world/map/pathRouter.ts`
- Create: `src/world/map/pathRouter.test.ts`

**Interfaces:**
- Produces: `routeCorridors(graph, sites, traversalGrid, fields, regions, options): RoutedCorridor[]`.
- Produces: `corridorFits(cell, width, clearance, exclusions): boolean`.

- [ ] **Step 1: Write routing tests**

```ts
it('rejects a centerline whose full corridor width leaves the map', () => {
  expect(corridorFits(edgeCellFixture(), 12, 3, emptyExclusions())).toBe(false);
});

it('ends in the site access band instead of requiring the center', () => {
  const [corridor] = routeFixtureWithBlockedSiteCenter();
  expect(isInAccessBand(corridor.centerline.at(-1)!, targetSite)).toBe(true);
});

it('shares an initial trunk but penalizes third reuse', () => {
  const corridors = routeReuseFixture();
  expect(sharedCells(corridors[0]!, corridors[1]!).length).toBeGreaterThan(0);
  expect(sharedCells(corridors[0]!, corridors[2]!).length).toBeLessThan(sharedCells(corridors[0]!, corridors[1]!).length);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/pathRouter.test.ts`

Expected: FAIL because `pathRouter.ts` does not exist.

- [ ] **Step 3: Implement fine-grid A***

Precompute a clearance mask by eroding bounds and foreign Site cores by `width / 2 + clearance`. Sample continuous fields bilinearly and categories by containing FieldGrid cell. Include previous-direction in the A* state for turn cost. Apply corridor-use multipliers `0.75`, `1.25`, and `2.0`. Terminate at any fitting cell in the target access band. Convert cell centers to a simplified polyline without changing occupied cells.

- [ ] **Step 4: Verify GREEN and corridor determinism**

Run: `npm test -- --run src/world/map/pathRouter.test.ts`

Expected: PASS with identical serialized corridors for repeated seeds/options.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/pathRouter.ts src/world/map/pathRouter.test.ts
git commit -m "feat(map): breitebewusste Korridore routen"
```

### Task 8: Realisierte Fahr-Topologie, Site-Tags und Reservations

**Files:**
- Create: `src/world/map/realizedTraversalGraph.ts`
- Create: `src/world/map/realizedTraversalGraph.test.ts`
- Create: `src/world/map/siteRoleResolver.ts`
- Create: `src/world/map/siteRoleResolver.test.ts`
- Create: `src/world/map/spatialReservations.ts`
- Create: `src/world/map/spatialReservations.test.ts`

**Interfaces:**
- Produces: `buildRealizedTraversalGraph(sites, corridors, grid): RealizedTraversalGraph`.
- Produces: `resolveSiteTopology(realized, spawnId): Record<SiteId, SiteTopology>`.
- Produces: `generateSpatialReservations(...): SpatialReservation[]`.

- [ ] **Step 1: Write crossing, tags and reservation tests**

```ts
it('turns a shared corridor cell into a junction before resolving dead ends', () => {
  const graph = buildRealizedTraversalGraph(sharedTrunkFixture().sites, sharedTrunkFixture().corridors, TRAVERSAL_GRID);
  expect(graph.nodes.some((n) => n.kind === 'junction')).toBe(true);
  expect(resolveSiteTopology(graph, 'spawn').branch.tags).not.toContain('deadEnd');
});

it('allows remote and deadEnd tags together', () => {
  const tags = resolveSiteTopology(remoteDeadEndFixture(), 'spawn').remote.tags;
  expect(tags).toContain('remote');
  expect(tags).toContain('deadEnd');
});

it('reserves corridor width and larger spawn clearance', () => {
  const r = generateReservationFixture();
  expect(r.find((x) => x.type === 'spawn')?.clearance).toBeGreaterThan(r.find((x) => x.type === 'corridor')?.clearance ?? Infinity);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/realizedTraversalGraph.test.ts src/world/map/siteRoleResolver.test.ts src/world/map/spatialReservations.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement realized nodes, tags and typed reservations**

Create junction nodes at occupied cells with three or more realized neighbors and at transitions between shared and unshared corridor runs. Collapse degree-2 runs into weighted edges. Calculate shortest paths from spawn using realized lengths. Tag `remote` when distance is in the upper quartile and at least `1.25 * median`; detect cycle membership for `loopNode`.

Generate reservations for spawn disc, Site core/access band, corridor swept width, junction turn disc and explicit negative-space clearings. Keep type, geometry, clearance and allowed edge-feature roles.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/world/map/realizedTraversalGraph.test.ts src/world/map/siteRoleResolver.test.ts src/world/map/spatialReservations.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/realizedTraversalGraph.ts src/world/map/realizedTraversalGraph.test.ts src/world/map/siteRoleResolver.ts src/world/map/siteRoleResolver.test.ts src/world/map/spatialReservations.ts src/world/map/spatialReservations.test.ts
git commit -m "feat(map): reale Topologie und Reservations ableiten"
```

### Task 9: Landschaftsgrammatik und lokale Komposition

**Files:**
- Create: `src/world/map/landscapeGrammar.ts`
- Create: `src/world/map/landscapeGrammar.test.ts`
- Create: `src/world/map/landscapeGenerator.ts`
- Create: `src/world/map/landscapeGenerator.test.ts`

**Interfaces:**
- Produces: `LANDSCAPE_RECIPES: Record<BiomeId, LandscapeRecipe>`.
- Produces: `generateLandscape(context, rng): { features: LandscapeFeature[]; negativeSpace: SpatialReservation[] }`.
- Produces: `featureFitsReservations(feature, reservations): boolean`.

- [ ] **Step 1: Write grammar and composition tests**

```ts
it('defines patterns rather than per-biome scatter counts', () => {
  expect(LANDSCAPE_RECIPES.industrial.patterns.map((p) => p.kind)).toEqual(expect.arrayContaining(['line', 'cluster']));
  expect(JSON.stringify(LANDSCAPE_RECIPES)).not.toContain('scatter');
});

it('never places blocking envelopes inside hard reservations', () => {
  const result = generateLandscape(landscapeFixture(12), createSeedStream(12, 'landscape'));
  for (const f of result.features.filter((x) => x.traversal === 'blocking')) {
    expect(featureFitsReservations(f, landscapeFixture(12).reservations)).toBe(true);
  }
});

it('creates geometry from large to small with deterministic ids', () => {
  const a = generateLandscape(landscapeFixture(55), createSeedStream(55, 'landscape'));
  expect(a.features[0]?.size).toBe('large');
  expect(a).toEqual(generateLandscape(landscapeFixture(55), createSeedStream(55, 'landscape')));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts`

Expected: FAIL because the grammar and generator do not exist.

- [ ] **Step 3: Implement recipes and rule emitters**

Implement emitters `emitCluster`, `emitLine`, `emitArc`, `emitBlob`, `emitEdge`, and `emitIsland`. Each returns positive features and optional negative-space reservations. Orient them from macro axis, field gradient, corridor tangent or region border. Process `large`, `medium`, then `small`, updating one occupancy mask after every accepted envelope.

Use explicit first recipes from the spec. Ensure `LandscapeFeature.footprint` is the authoritative envelope and generated IDs use stage-local sequence numbers only.

- [ ] **Step 4: Verify GREEN over 100 seeds**

Run: `npm test -- --run src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts`

Expected: PASS, including zero hard-reservation violations over seeds 1 through 100.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/landscapeGrammar.ts src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.ts src/world/map/landscapeGenerator.test.ts
git commit -m "feat(map): lokale Landschaftskomposition erzeugen"
```

### Task 10: Lesender Validator und Weltorchestrator

**Files:**
- Create: `src/world/map/worldValidator.ts`
- Create: `src/world/map/worldValidator.test.ts`
- Create: `src/world/map/worldGenerator.ts`
- Create: `src/world/map/worldGenerator.test.ts`

**Interfaces:**
- Produces: `validateWorld(world): WorldValidation` without mutation.
- Produces: `assertValidWorld(world): void` throwing `WorldGenerationError` on the first hard failure.
- Produces: `generiereWelt(options, seed): GenerierteWelt`.
- Produces: `DEFAULT_WORLD_OPTIONS` with the exact grids, extents, corridor width `12`, clearance `3`, and max Site degree `4`.
- Produces: `WorldGenerationError` with `seed`, `stage`, `invariant`, `diagnostics`.

- [ ] **Step 1: Write validator and full-pipeline tests**

```ts
it('does not mutate the validated world', () => {
  const world = validWorldFixture();
  const before = JSON.stringify(world);
  validateWorld(world);
  expect(JSON.stringify(world)).toBe(before);
});

it('throws diagnostic errors instead of rerolling', () => {
  expect(() => assertValidWorld(invalidDisconnectedWorld(17))).toThrowError(expect.objectContaining({ seed: 17, invariant: 'all-sites-reachable' }));
});

it('generates byte-stable worlds for 500 seeds', () => {
  for (let seed = 1; seed <= 500; seed++) {
    expect(JSON.stringify(generiereWelt(DEFAULT_WORLD_OPTIONS, seed))).toBe(JSON.stringify(generiereWelt(DEFAULT_WORLD_OPTIONS, seed)));
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/worldValidator.test.ts src/world/map/worldGenerator.test.ts`

Expected: FAIL because validator and orchestrator do not exist.

- [ ] **Step 3: Implement validation and orchestration**

Validate field completeness, region contiguity, Site bounds, both graph connectivities, degree 4, edge/corridor correspondence, hard Reservations, Feature bounds, traversal flood-fill and deterministic debug data. Return neutral quality metrics from the spec.

In `generiereWelt`, call every stage exactly once with its labeled RNG. Freeze or readonly-wrap stage outputs in development tests. Validate the assembled abstract world, throw `WorldGenerationError` on hard failures, and attach only deterministic validation/metric data to `debug`.

- [ ] **Step 4: Verify GREEN and full pure-map suite**

Run: `npm test -- --run src/world/map/worldValidator.test.ts src/world/map/worldGenerator.test.ts`

Expected: PASS for 500 seeds with zero hard failures.

Run: `npm test -- --run src/world/map/worldGrid.test.ts src/world/map/seedStreams.test.ts src/world/map/worldDNA.test.ts src/world/map/macroStructure.test.ts src/world/map/worldFields.test.ts src/world/map/regionGenerator.test.ts src/world/map/siteGenerator.test.ts src/world/map/traversalGraph.test.ts src/world/map/pathRouter.test.ts src/world/map/realizedTraversalGraph.test.ts src/world/map/siteRoleResolver.test.ts src/world/map/spatialReservations.test.ts src/world/map/landscapeGrammar.test.ts src/world/map/landscapeGenerator.test.ts src/world/map/worldValidator.test.ts src/world/map/worldGenerator.test.ts`

Expected: all listed tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldValidator.ts src/world/map/worldValidator.test.ts src/world/map/worldGenerator.ts src/world/map/worldGenerator.test.ts
git commit -m "feat(map): Hybridwelt validieren und orchestrieren"
```

### Task 11: Assetvertrag und Graybox-Runtimeprojektion

**Files:**
- Create: `src/world/map/runtimeMap.ts`
- Create: `src/world/map/grayboxResolver.ts`
- Create: `src/world/map/grayboxResolver.test.ts`
- Modify: `src/world/map/mapTypes.ts`
- Modify: `src/world/map/assetKit.ts`
- Modify: `src/world/map/assetKit.test.ts`
- Modify: `src/world/map/loader.ts`
- Modify: `src/world/map/loader.test.ts`

**Interfaces:**
- Produces: `RuntimeKarte { seed, extents, spawn, entities, regionCells, corridors }`.
- Produces: `resolveGraybox(world): RuntimeKarte`.
- Produces: `resolveAsset(feature, rng): AssetDef` enforcing envelope containment.

- [ ] **Step 1: Write runtime and envelope tests**

```ts
it('projects without changing abstract world bytes', () => {
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, 91);
  const before = JSON.stringify(world);
  const runtime = resolveGraybox(world);
  expect(runtime.seed).toBe(91);
  expect(JSON.stringify(world)).toBe(before);
});

it('rejects an asset whose blocking shape exceeds the feature envelope', () => {
  expect(() => assertAssetFits(featureEnvelope(8, 12), assetEnvelope(10, 15))).toThrow('asset-envelope-exceeded');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/grayboxResolver.test.ts src/world/map/assetKit.test.ts src/world/map/loader.test.ts`

Expected: FAIL because runtime projection and the new asset fields do not exist.

- [ ] **Step 3: Implement the runtime boundary and migrate assets**

Keep `Vec2`, `Vec3`, `MapEntity`, `EntityKind`, and `AssetId` in `mapTypes.ts`; remove `Zone`, `ZoneTheme`, `MapPath`, and `KartenDaten`. Add to every `AssetDef`: `blockingShape`, `allowedBiomes`, `placementModes`, `traversal`, `clearance`, `allowedRotations`, and `tags`.

Map abstract Graybox features to the smallest fitting existing primitive asset by traversal, placement mode and biome. Use only the `visuals` RNG stream. Make `ladeKarte(scene, daten: RuntimeKarte)` consume `entities` without generator concepts.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/world/map/grayboxResolver.test.ts src/world/map/assetKit.test.ts src/world/map/loader.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/runtimeMap.ts src/world/map/grayboxResolver.ts src/world/map/grayboxResolver.test.ts src/world/map/mapTypes.ts src/world/map/assetKit.ts src/world/map/assetKit.test.ts src/world/map/loader.ts src/world/map/loader.test.ts
git commit -m "feat(map): Graybox-Welt in Runtimekarte projizieren"
```

### Task 12: Regionen-, Strassen- und Mapsmith-Debugdarstellung

**Files:**
- Create: `src/world/map/regionGroundData.ts`
- Create: `src/world/map/regionGroundData.test.ts`
- Create: `src/world/map/regionGround.ts`
- Create: `src/world/map/worldDebugProjection.ts`
- Create: `src/world/map/worldDebugProjection.test.ts`
- Modify: `src/world/map/roadMesh.ts`
- Modify: `src/world/map/roadTopology.test.ts`
- Modify: `src/ui/mapsmithHud.ts`

**Interfaces:**
- Produces: `buildRegionGroundData(runtime): Record<BiomeId, MeshData>`.
- Produces: `corridorRenderCells(corridors, grid): string[]`.
- Produces: `projectWorldDebug(world, layer): DebugPrimitives`.

- [ ] **Step 1: Write pure render-data tests**

```ts
it('builds one indexed quad set per biome without missing cells', () => {
  const data = buildRegionGroundData(runtimeRegionFixture());
  expect(Object.values(data).reduce((n, x) => n + x.cellCount, 0)).toBe(FIELD_GRID.cols * FIELD_GRID.rows);
});

it('derives road tiles from corridor cells rather than generator-owned road cells', () => {
  expect(corridorRenderCells(corridorFixture(), TRAVERSAL_GRID)).toEqual(['80,64', '81,64', '82,64']);
});

it('projects every Mapsmith layer deterministically', () => {
  const world = debugWorldFixture();
  for (const layer of DEBUG_LAYERS) expect(projectWorldDebug(world, layer)).toEqual(projectWorldDebug(world, layer));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/regionGroundData.test.ts src/world/map/worldDebugProjection.test.ts src/world/map/roadTopology.test.ts`

Expected: FAIL because the new render-data modules do not exist.

- [ ] **Step 3: Implement Babylon adapters and debug layers**

Generate merged indexed quads directly from region cells, one Babylon mesh/material per biome. Change `createRoadMesh` to accept corridors and a TraversalGrid spec, deriving one-cell visual centerlines while logical clearance remains wider. Extend Mapsmith HUD with a top-down canvas and layer selection for DNA, macro, fields, potentials, biomes, regions, Sites, intent graph, realized graph, corridors, Reservations, Features and validation.

- [ ] **Step 4: Verify GREEN and build**

Run: `npm test -- --run src/world/map/regionGroundData.test.ts src/world/map/worldDebugProjection.test.ts src/world/map/roadTopology.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/regionGroundData.ts src/world/map/regionGroundData.test.ts src/world/map/regionGround.ts src/world/map/worldDebugProjection.ts src/world/map/worldDebugProjection.test.ts src/world/map/roadMesh.ts src/world/map/roadTopology.test.ts src/ui/mapsmithHud.ts
git commit -m "feat(map): Hybridwelt und Debug-Layer rendern"
```

### Task 13: Runtime integrieren und Altgenerator entfernen

**Files:**
- Modify: `src/main.ts`
- Modify: `src/world/map/mapsmith.ts`
- Modify: `src/world/map/mapsmith.test.ts`
- Modify: `src/world/map/curatedMaps.ts`
- Modify: `src/world/map/mapTuning.ts`
- Delete: all legacy files listed in the File Structure section.

**Interfaces:**
- Consumes: `generiereWelt(DEFAULT_WORLD_OPTIONS, seed)` and `resolveGraybox(world)`.
- Removes: every import and runtime path to city/module/scatter generators.

- [ ] **Step 1: Write the new Mapsmith state test**

```ts
it('stores only hybrid generator identity and seed', () => {
  expect(createMapsmith('hybrid', 1337)).toEqual({ aktiv: false, generatorId: 'hybrid', seed: 1337, layer: 'regions' });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/world/map/mapsmith.test.ts`

Expected: FAIL because the state still uses `rezeptId` and has no layer.

- [ ] **Step 3: Replace main integration and delete legacy generation**

Replace the map setup with:

```ts
let welt = generiereWelt(DEFAULT_WORLD_OPTIONS, mapsmith.seed);
let karte = resolveGraybox(welt);
let mapHandle = ladeKarte(scene, karte);
```

On reroll, regenerate `welt`, project `karte`, reload entities, region ground, corridor mesh and Mapsmith debug projection. Log deterministic metrics instead of old `valid/warnungen` fields.

Delete the listed legacy files using an explicit patch. Keep gameplay-related `MAP_TUNING` values used by nests, hazards, breakables, collectibles and secrets; remove only zone/scatter/generator values after reference checks.

- [ ] **Step 4: Prove no old generator path remains**

Run: `Get-ChildItem -LiteralPath src -Recurse -File -Include *.ts | Select-String -Pattern 'generiereStadt|modulePlacement|moduleRoads|moduleStamp|MODUL_KATALOG|from ''./generator''|KartenDaten|ZoneTheme|rezeptId'`

Expected: no output except unrelated prose that is deliberately retained outside runtime source; remove source references until the command is empty.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/world/map src/ui/mapsmithHud.ts
git commit -m "feat(map): alten Generator durch Hybridwelt ersetzen"
```

### Task 14: 500-Seed-Audit und visuelle Graybox-Abnahme

**Files:**
- Create: `src/world/map/worldQuality.test.ts`
- Modify: generator options or recipes only when a failing metric identifies a concrete rule defect.

**Interfaces:**
- Consumes: public `generiereWelt` and deterministic debug metrics.
- Produces: a regression suite for broad seed quality.

- [ ] **Step 1: Write aggregate quality assertions**

```ts
it('keeps 500 seeds valid and structurally varied', () => {
  const signatures = new Set<string>();
  for (let seed = 1; seed <= 500; seed++) {
    const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
    expect(world.debug.validation.hardFailures).toEqual([]);
    expect(world.sites.length).toBeGreaterThanOrEqual(7);
    expect(world.corridors.length).toBe(world.intentGraph.edges.length);
    signatures.add(world.debug.quality.signature);
  }
  expect(signatures.size).toBeGreaterThan(400);
});
```

- [ ] **Step 2: Run the audit and record genuine failures**

Run: `npm test -- --run src/world/map/worldQuality.test.ts`

Expected: initial FAIL only if a seed violates an agreed invariant or variation threshold. Preserve each failing seed as a named regression case before changing production rules.

- [ ] **Step 3: Correct stage-local defects test-first**

For every failing seed, add one focused test to its responsible stage, run it RED, change only that stage, run it GREEN, then rerun the 500-seed audit. Do not add seed blacklists, seed rerolls or legacy fallbacks.

- [ ] **Step 4: Perform visual/runtime verification**

Run: `npm run dev -- --host 127.0.0.1`

Open `http://127.0.0.1:5174/`, inspect seeds 1 through 20 in Mapsmith, and verify:

- all Sites are reachable by the player tank,
- region boundaries and main axes are visible in Graybox,
- open and dense DNA profiles differ materially,
- at least one loop and deliberate dead ends are readable,
- no corridor is visually blocked by a Graybox feature,
- Mapsmith layers match the generated abstract data,
- no old module rectangles or L-road-only composition remains.

Then run: `npm test`

Expected: all tests PASS.

Then run: `npm run build`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldQuality.test.ts src/world/map
git commit -m "test(map): Hybridgenerator ueber 500 Seeds absichern"
```

## Final Verification

Run all commands from `D:\Workspace_aktuall\ChaosTankNew`:

```powershell
npm test
npm run build
git status --short
git log --oneline -15
```

Required evidence:

- zero failed tests,
- production build exits 0,
- no old generator source/import remains,
- only intended Hybridgenerator commits were added,
- pre-existing unrelated worktree changes remain uncommitted and untouched,
- twenty inspected Graybox-Seeds satisfy the visual checklist.
