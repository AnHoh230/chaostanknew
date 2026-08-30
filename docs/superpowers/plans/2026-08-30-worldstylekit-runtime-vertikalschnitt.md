# WorldStyleKit Runtime-Vertikalschnitt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das genehmigte Industrial-Scrap-StyleKit auf unveränderten Hybridgenerator-Welten in einer eigenständigen, fallbackfreien Babylon-AssetLab-Ansicht rendern.

**Architecture:** Ein reiner Compiler übersetzt `GenerierteWelt`, Kit, Manifest und Visual-Seed in einen serialisierbaren PlacementPlan. Reine Geometriefunktionen erzeugen Ground-, Transition-, Ribbon- und 2.5D-Primitive-Daten; ein dünner Babylon-Renderer materialisiert diese Daten. `asset-lab.html` verwendet denselben Generator wie das Spiel, aber weder Graybox-Resolver noch Spielrenderer.

**Tech Stack:** TypeScript 5.6, Babylon.js 8, Vite 6, Vitest 2, HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-08-30-worldstylekit-runtime-vertikalschnitt-design.md`

## Global Constraints

- Der Hybridgenerator und seine Weltgeometrie bleiben unverändert die einzige räumliche Autorität.
- Kein Legacy-, Graybox-, Fremd-Kit- oder Zufalls-Fallback.
- Kit-Auswahl darf nur den Visual-Seed, niemals den Welt-Seed oder Generatorzustand verbrauchen.
- Preview-Teilabdeckung muss durch Klassen- und Biom-Scope sichtbar und validierbar sein.
- Runtime-Aktivierung bleibt gesperrt, bis der vollständige nicht reservierte Pflichtkatalog abgedeckt ist.
- Kollisions- und Traversaldaten werden nicht aus Texturen oder Render-Meshes abgeleitet.

---

### Task 1: Preview-Scope und Manifest-Gate härten

**Files:**
- Modify: `src/world/map/assetDemandTypes.ts`
- Modify: `src/world/map/worldStyleKit.ts`
- Modify: `src/world/map/worldStyleKit.test.ts`
- Modify: `src/world/map/assetCandidateManifest.ts`
- Modify: `src/world/map/assetCandidateManifest.test.ts`
- Modify: `src/world/map/ironwasteStyleKit.ts`

**Interfaces:**
- Produces: `WorldStyleKit.previewBiomes: BiomeId[]`
- Produces: `assertApprovedCandidateManifest(manifest, kit, catalog): void`
- Consumes: vorhandene `validateWorldStyleKit`- und Manifest-Verträge.

- [ ] **Step 1: Fehlende Biom- und Approval-Gates testen**

```ts
expect(() => validateWorldStyleKit({ ...previewKit, previewBiomes: [] }, catalog))
  .toThrow('preview-kit-has-no-biomes');
expect(() => assertApprovedCandidateManifest({ ...manifest, state: 'candidate' }, kit, catalog))
  .toThrow('candidate-manifest-not-approved');
```

- [ ] **Step 2: Gezielte Tests ausführen und erwartetes Rot bestätigen**

Run: `npx vitest run src/world/map/worldStyleKit.test.ts src/world/map/assetCandidateManifest.test.ts`

Expected: FAIL, weil `previewBiomes` und `assertApprovedCandidateManifest` fehlen.

- [ ] **Step 3: Verträge minimal implementieren**

```ts
export interface WorldStyleKit {
  // vorhandene Felder
  previewBiomes: BiomeId[];
}

export function assertApprovedCandidateManifest(
  manifest: AssetCandidateManifest,
  kit: WorldStyleKit,
  catalog: RequiredAssetCatalog,
): void {
  if (manifest.state !== 'approved') throw new Error(`candidate-manifest-not-approved:${kit.id}`);
  // ID, Version und Signaturen strikt vergleichen.
}
```

- [ ] **Step 4: Tests grün ausführen**

Run: `npx vitest run src/world/map/worldStyleKit.test.ts src/world/map/assetCandidateManifest.test.ts src/world/map/ironwasteStyleKit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/assetDemandTypes.ts src/world/map/worldStyleKit.ts src/world/map/worldStyleKit.test.ts src/world/map/assetCandidateManifest.ts src/world/map/assetCandidateManifest.test.ts src/world/map/ironwasteStyleKit.ts
git commit -m "feat(assets): Preview-Scope und Manifest hart validieren"
```

### Task 2: Autoritative Placement-Ziele und Plan kompilieren

**Files:**
- Modify: `src/world/map/worldAssetDemands.ts`
- Modify: `src/world/map/worldAssetDemands.test.ts`
- Create: `src/world/map/worldAssetPlacement.ts`
- Create: `src/world/map/worldAssetPlacement.test.ts`

**Interfaces:**
- Produces: `buildWorldAssetPlacementPlan(world, kit, manifest, visualSeed): WorldAssetPlacementPlan`
- Produces: discriminated `WorldAssetPlacement`-Typen für Ground, Transition, Corridor, Junction, Landscape, Site und Entrance.
- Consumes: `deriveWorldAssetDemands`, `resolveAssetFamily`, `assertApprovedCandidateManifest`.

- [ ] **Step 1: Tests für pro-Korridor-Entrances, Determinismus und Welt-Unveränderlichkeit schreiben**

```ts
const before = JSON.stringify(world);
const first = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, manifest, 17);
const second = buildWorldAssetPlacementPlan(world, IRONWASTE_V1_PREVIEW_KIT, manifest, 17);
expect(first).toEqual(second);
expect(JSON.stringify(world)).toBe(before);
expect(first.placements.filter((entry) => entry.kind === 'entrance').length)
  .toBe(world.corridors.length * 2);
expect(first.omitted.every((entry) => entry.reason === 'outside-preview-scope')).toBe(true);
```

- [ ] **Step 2: Tests ausführen und erwartetes Rot bestätigen**

Run: `npx vitest run src/world/map/worldAssetDemands.test.ts src/world/map/worldAssetPlacement.test.ts`

Expected: FAIL, weil der Compiler fehlt und Entrances nur pro Site emittiert werden.

- [ ] **Step 3: Demand-IDs und Placement-Compiler implementieren**

```ts
export interface WorldAssetPlacementPlan {
  worldSeed: number;
  visualSeed: number;
  kitId: string;
  kitVersion: number;
  placements: WorldAssetPlacement[];
  omitted: Array<{ demandId: string; demandClass: string; reason: 'outside-preview-scope' }>;
}
```

Der Compiler baut ein eindeutiges Demand-Map, filtert Preview-Vorkommnisse ausschließlich über `previewScope` plus `previewBiomes`, löst jedes verbleibende Demand hart auf und erzeugt Geometriezielwerte direkt aus `GenerierteWelt`.

- [ ] **Step 4: Tests grün ausführen**

Run: `npx vitest run src/world/map/worldAssetDemands.test.ts src/world/map/worldAssetPlacement.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldAssetDemands.ts src/world/map/worldAssetDemands.test.ts src/world/map/worldAssetPlacement.ts src/world/map/worldAssetPlacement.test.ts
git commit -m "feat(map): StyleKit-Platzierungen aus Welt kompilieren"
```

### Task 3: Reine Surface- und Straßengeometrie erzeugen

**Files:**
- Create: `src/world/map/styleSurfaceGeometry.ts`
- Create: `src/world/map/styleSurfaceGeometry.test.ts`
- Create: `src/world/map/styleRoadGeometry.ts`
- Create: `src/world/map/styleRoadGeometry.test.ts`

**Interfaces:**
- Produces: `buildCellSurfaceGeometry(grid, cells, uvScale): MeshGeometryData`
- Produces: `buildTransitionGeometry(placement, blendWidth, uvScale): MeshGeometryData`
- Produces: `buildRoadRibbonGeometry(centerline, width, uvScale): MeshGeometryData`
- Produces: `buildRoadCapGeometry(position, radius, uvScale): MeshGeometryData`

- [ ] **Step 1: Geometrieinvarianten als Tests schreiben**

```ts
const ribbon = buildRoadRibbonGeometry([{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 8, z: 8 }], 6, 8);
expect(ribbon.positions.every(Number.isFinite)).toBe(true);
expect(ribbon.indices.length).toBeGreaterThan(0);
expect(widthAt(ribbon, 0)).toBeCloseTo(6, 4);
expect(widthAt(ribbon, 1)).toBeCloseTo(6, 4);
```

- [ ] **Step 2: Tests rot ausführen**

Run: `npx vitest run src/world/map/styleSurfaceGeometry.test.ts src/world/map/styleRoadGeometry.test.ts`

Expected: FAIL, weil beide Module fehlen.

- [ ] **Step 3: Zellquads, gerichtete Transition-Quads und miterbegrenzte Ribbons implementieren**

```ts
export interface MeshGeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}
```

Kurvennormalen werden aus den benachbarten Segmentnormalen gemittelt. Der Miter-Faktor wird so begrenzt, dass die Streifenbreite endlich bleibt und höchstens das 1,75-Fache der halben Sollbreite erreicht.

- [ ] **Step 4: Tests grün ausführen**

Run: `npx vitest run src/world/map/styleSurfaceGeometry.test.ts src/world/map/styleRoadGeometry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/styleSurfaceGeometry.ts src/world/map/styleSurfaceGeometry.test.ts src/world/map/styleRoadGeometry.ts src/world/map/styleRoadGeometry.test.ts
git commit -m "feat(map): geschlossene StyleKit-Flaechen und Strassen erzeugen"
```

### Task 4: Footprint-sichere 2.5D-Rezepte erzeugen

**Files:**
- Create: `src/world/map/styleGeometryRecipes.ts`
- Create: `src/world/map/styleGeometryRecipes.test.ts`

**Interfaces:**
- Produces: `buildStyleGeometryRecipe(recipeId, footprint, variantId): StylePrimitive[]`
- Consumes: `geometryRecipe` der gewählten Assetvariante.

- [ ] **Step 1: Alle Ironwaste-Rezepte und Hüllentreue testen**

```ts
for (const recipeId of IRONWASTE_RECIPE_IDS) {
  const primitives = buildStyleGeometryRecipe(recipeId, { halfX: 8, halfZ: 6 }, 'variant-2');
  expect(primitives.length).toBeGreaterThan(0);
  expect(() => assertPrimitivesFit(primitives, { halfX: 8, halfZ: 6 })).not.toThrow();
}
expect(() => buildStyleGeometryRecipe('unknown', footprint, 'v1'))
  .toThrow('unsupported-style-geometry-recipe:unknown');
```

- [ ] **Step 2: Tests rot ausführen**

Run: `npx vitest run src/world/map/styleGeometryRecipes.test.ts`

Expected: FAIL, weil das Rezeptmodul fehlt.

- [ ] **Step 3: Datengetriebene Primitive implementieren**

```ts
export interface StylePrimitive {
  shape: 'box' | 'cylinder';
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotationY: number;
  paletteSlot: string;
}
```

Varianten unterscheiden nur die lokale, deterministische Anordnung innerhalb derselben Hülle. `assertPrimitivesFit` berücksichtigt die gedrehte XZ-AABB jedes Primitivs.

- [ ] **Step 4: Tests grün ausführen**

Run: `npx vitest run src/world/map/styleGeometryRecipes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/styleGeometryRecipes.ts src/world/map/styleGeometryRecipes.test.ts
git commit -m "feat(assets): Ironwaste-Geometrien footprint-sicher beschreiben"
```

### Task 5: Babylon-PreviewRenderer materialisieren

**Files:**
- Create: `src/world/map/worldStylePreviewRenderer.ts`
- Create: `src/world/map/worldStylePreviewRenderer.test.ts`

**Interfaces:**
- Produces: `createWorldStylePreview(scene, plan, kit): WorldStylePreviewHandle`
- Consumes: PlacementPlan und reine Geometriemodule aus Tasks 2 bis 4.

- [ ] **Step 1: NullEngine-Lebenszyklus und fehlende Rezepte testen**

```ts
const engine = new NullEngine();
const scene = new Scene(engine);
const handle = createWorldStylePreview(scene, plan, IRONWASTE_V1_PREVIEW_KIT);
expect(handle.meshCount).toBeGreaterThan(0);
handle.dispose();
expect(scene.meshes).toHaveLength(0);
```

- [ ] **Step 2: Test rot ausführen**

Run: `npx vitest run src/world/map/worldStylePreviewRenderer.test.ts`

Expected: FAIL, weil der Renderer fehlt.

- [ ] **Step 3: Renderer implementieren**

Materialien werden pro Variant-Datei gecacht, Texturen wrappen in U/V, und die globalen Palette-Slots erzeugen geteilte matte Strukturmaterialien. Renderhöhen sind fest gestaffelt: Ground `0.025`, Transition `0.04`, Road Edge `0.055`, Road Surface `0.065`, Decals `0.075`.

- [ ] **Step 4: Test grün ausführen**

Run: `npx vitest run src/world/map/worldStylePreviewRenderer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/map/worldStylePreviewRenderer.ts src/world/map/worldStylePreviewRenderer.test.ts
git commit -m "feat(assets): StyleKit-PlacementPlan in Babylon rendern"
```

### Task 6: Eigenständiges AssetLab integrieren

**Files:**
- Create: `asset-lab.html`
- Create: `src/assetLab.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Create: `src/world/map/assetLabAcceptance.test.ts`

**Interfaces:**
- Produces: Vite-Einstieg `/asset-lab.html?seed=11&visualSeed=1`
- Produces: `npm run assets:lab`
- Consumes: Generator, genehmigtes Manifest, Ironwaste-Kit, PlacementCompiler und PreviewRenderer.

- [ ] **Step 1: Zwanzig-Seed-Abnahme und HTML-Einstieg testen**

```ts
for (let seed = 1; seed <= 20; seed++) {
  const world = generiereWelt(DEFAULT_WORLD_OPTIONS, seed);
  const before = JSON.stringify(world);
  const plan = buildWorldAssetPlacementPlan(world, kit, manifest, 1);
  expect(plan.placements.length).toBeGreaterThan(0);
  expect(JSON.stringify(world)).toBe(before);
}
```

- [ ] **Step 2: Test rot ausführen**

Run: `npx vitest run src/world/map/assetLabAcceptance.test.ts`

Expected: FAIL, bis Manifest-Import und AssetLab-Vertrag verdrahtet sind.

- [ ] **Step 3: AssetLab, Steuerung und Multi-Page-Build implementieren**

`assetLab.ts` erzeugt Engine, ArcRotateCamera, Kit-Licht und Welt. Seed- und Visual-Seed-Buttons schreiben Queryparameter, bauen Plan und Szene neu und zeigen Kit-ID, Katalogsignatur, Placement-Anzahl sowie ausgelassene Demand-Klassen. Fehler erscheinen im sichtbaren Statusblock; es wird kein anderer Renderer geladen.

- [ ] **Step 4: Abnahme, fokussierte Suite und Build ausführen**

Run: `npx vitest run src/world/map/assetLabAcceptance.test.ts src/world/map/worldAssetPlacement.test.ts src/world/map/styleSurfaceGeometry.test.ts src/world/map/styleRoadGeometry.test.ts src/world/map/styleGeometryRecipes.test.ts src/world/map/worldStylePreviewRenderer.test.ts`

Run: `npm run build`

Expected: alle Tests PASS; `dist/asset-lab.html` und `dist/assets/*` entstehen.

- [ ] **Step 5: Visuell in echter Browser-Session prüfen**

Run: `npm run assets:lab`

Öffnen: `http://localhost:5174/asset-lab.html?seed=11&visualSeed=1`

Prüfen: Industrial/Scrap-Flächen sind texturiert; nur gemeinsame Übergänge erscheinen; Straßen folgen Kurven ohne Lücken; Scope und Auslassungen sind sichtbar; Seedwechsel erzeugt eine neue Welt; Visual-Seedwechsel ändert nur Varianten.

- [ ] **Step 6: Commit**

```bash
git add asset-lab.html src/assetLab.ts vite.config.ts package.json src/world/map/assetLabAcceptance.test.ts
git commit -m "feat(dev): generierte StyleKit-Welten im AssetLab zeigen"
```

### Task 7: Katalogaudit und Gesamtverifikation aktualisieren

**Files:**
- Modify: `docs/generated/asset-seed-coverage.json`
- Modify: `docs/generated/ironwaste-v1-qa.md`

**Interfaces:**
- Consumes: korrigierte pro-Korridor-Entrance-Demands.
- Produces: reproduzierbare 500-Seed-Abdeckung und finalen QA-Nachweis.

- [ ] **Step 1: Generierte Nachweise aktualisieren**

Run: `npm run assets:audit`

Run: `npm run assets:verify`

Expected: 32/32 Katalogklassen beobachtet, keine unbekannten oder fehlenden Klassen, Manifest weiterhin approved.

- [ ] **Step 2: Vollständige Testsuite ausführen**

Run: `npm test -- --run`

Expected: 0 Fehler.

- [ ] **Step 3: Produktionsbuild erneut ausführen**

Run: `npm run build`

Expected: erfolgreicher TypeScript- und Vite-Build einschließlich `asset-lab.html`.

- [ ] **Step 4: Reproduzierbarkeit prüfen**

Run: `npm run assets:generate`

Run: `npm run assets:approve`

Run: `git status --short`

Expected: Assetgenerierung bleibt bytegleich; nur die geplanten Coverage-/QA- und Implementierungsdateien sind geändert.

- [ ] **Step 5: Commit**

```bash
git add docs/generated/asset-seed-coverage.json docs/generated/ironwaste-v1-qa.md
git commit -m "test(assets): Runtime-Vertikalschnitt ueber Seeds absichern"
```
