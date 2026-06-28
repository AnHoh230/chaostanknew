# Schrott-Spielplatz — Map-System & Map-Builder

## 1. Übersicht

Die Start-Umgebung wird eine kuratierte, handgemacht wirkende Karte, die ein **Autoren-Werkzeug** (Map-Builder) nach Vorgaben baut — kein Runtime-Zufall pro Run. Ein deterministischer Generator komponiert aus einem generischen Asset-Kit ein stimmiges, nicht-repetitives Schrottfeld; der Entwickler kuratiert gute Seeds über einen In-Game-**Mapsmith**-Modus; das Spiel lädt nur kuratierte Karten deterministisch. Die Karte ist interaktiv: zerstörbare Objekte, Fallen zum Ausweichen, schlafende Gegner-Nester die **Leben** droppen, Sammelobjekte und eine geheime Rampe zu einer Bonus-Insel.

**Invariante (verbindlich): kein Balance-Eingriff.** Loot/Breakables/Collectibles/Nester geben **niemals Impulse oder Skillpunkte** und beschleunigen den Build nicht. Nester droppen Leben (HP), keine Impulse. Die Gegner-Spawn-Rate (`gartenProgression`) wird nicht verändert. Der Endlos-Boden (`world/ground.ts`) bleibt als Hintergrund; die Karte ist eine gestaltete Region um den Ursprung. Keine Kopplung an Kompass/Finisher/Evolution/Fusion.

## 2. Datenmodell / Typen

Neue Module unter `src/world/map/`. Reine Logik ist Engine-frei und mit Vitest testbar (wie die übrigen `src/`-Module).

```ts
// src/world/map/mapTypes.ts
export interface Vec2 { x: number; z: number }            // Babylon X/Z-Ebene, y=0
export interface Vec3 { x: number; y: number; z: number }

export type ZoneTheme = 'offenerHof' | 'wrackCluster' | 'pressWerk' | 'funkturmZone';

export interface Zone {
  id: string;
  theme: ZoneTheme;
  center: Vec2;
  radiusX: number;
  radiusZ: number;
}

export type EntityKind =
  | 'breakable'    // Fass/Kiste/Schrott — zerstörbar
  | 'obstacle'     // Cover/Block, nicht zerstörbar
  | 'hazard'       // Falle — Schaden bei Kontakt, ausweichen
  | 'dormantNest'  // schlafender Gegner-Cluster
  | 'collectible'  // Fund — Heilung/Toy/Deko (nie Impulse)
  | 'landmark'     // Wahrzeichen, Orientierung
  | 'secretRamp'   // Sprungschanze → Bonus-Insel
  | 'bonusIsland'  // die Bonus-Insel selbst
  | 'decor';       // nicht-interaktive Deko

export type AssetId = string;

export interface MapEntity {
  id: string;
  kind: EntityKind;
  asset: AssetId;
  pos: Vec2;
  rotY: number;     // Rotation um Y in rad (Jitter)
  scale: number;    // Uniform-Skalierungs-Jitter
  params?: Record<string, number | string | boolean>; // kind-spezifisch (hp, hazardDmg, nestSize, lootTableId, ...)
}

export interface MapPath {
  id: string;
  punkte: Vec2[];   // Polyline befahrbarer Korridor
  breite: number;
}

export interface KartenDaten {
  rezeptId: string;
  seed: number;
  biomeId: string;            // z.B. 'schrottfeld'
  extents: { halfX: number; halfZ: number };
  spawn: Vec2;
  zones: Zone[];
  paths: MapPath[];
  entities: MapEntity[];
  valid: boolean;
  warnungen: string[];
}
```

```ts
// src/world/map/assetKit.ts
import type { AssetId, ZoneTheme, Vec3 } from './mapTypes';

export type AssetCategory = 'ground' | 'obstacle' | 'breakable' | 'hazard' | 'setpiece' | 'decor';

export interface AssetDef {
  id: AssetId;
  category: AssetCategory;
  footprint: number;          // Radius für Abstands-/Kollisionsprüfung
  themes: ZoneTheme[];        // Kohärenz: in welchen Zonen passend
  mesh: { form: 'box' | 'cylinder' | 'cone' | 'sphere'; size: Vec3; color: [number, number, number] };
  defaultParams?: Record<string, number | string | boolean>;
}

// Registry analog biomeRegistry: registerAsset(def) / getAsset(id) / assetsByThemeCategory(theme, cat)
```

```ts
// src/world/map/recipe.ts
import type { ZoneTheme, EntityKind } from './mapTypes';

export interface DichteRegel {
  theme: ZoneTheme;
  breakables: [number, number];   // [min, max]
  obstacles: [number, number];
  decor: [number, number];
  collectibles: [number, number];
}

export interface Rezept {
  id: string;
  biomeId: string;
  extents: { halfX: number; halfZ: number };
  zonen: { theme: ZoneTheme; gewicht: number }[];
  zonenAnzahl: [number, number];
  dichte: DichteRegel[];
  pflichtSetpieces: EntityKind[]; // z.B. ['landmark','dormantNest','hazard','secretRamp']
  hazardAnzahl: [number, number];
  nestAnzahl: [number, number];
  pfadBreite: number;
  minAbstand: number;             // globaler Boden-Mindestabstand
}

// REZEPTE: Record<string, Rezept> mit dem ersten Rezept 'schrottfeld'.
```

```ts
// src/world/map/curatedMaps.ts
export interface KuratierteKarte { id: string; rezeptId: string; seed: number }
// CURATED: KuratierteKarte[]  — vom Mapsmith befüllt, vom Run gelesen.
```

Tuning-Konstanten in `src/world/map/mapTuning.ts`: Blue-Noise-Radius pro Kategorie, Rotations-/Skalierungs-Jitter-Bereiche, Pfad-Freiraum, Validierungs-Schwellen, sowie Gameplay-Werte (Breakable-HP, Hazard-Schaden, Nest-Größe, Nest-Leben-Drop, Collectible-Heilung, Secret-Rampen-Schub). Keine dieser Zahlen liegt in Gameplay-Dateien.

## 3. Logik / Store

### 3.1 Generator (rein, deterministisch)

`generiere(rezept: Rezept, seed: number): KartenDaten` nutzt einen aus `seed` initialisierten RNG (`src/core/rng.ts`). Schritte:

1. **Zonen platzieren:** `zonenAnzahl` Zonen ziehen, Themen nach `zonen[].gewicht`; Zentren per Blue-Noise in `extents`; `radiusX/Z` je Thema (+ Jitter).
2. **Pflicht-Set-Pieces stampen:** Anker je Thema — `landmark` in `funkturmZone`, `hazard` in `pressWerk`, `dormantNest` nahe Landmark, `secretRamp` an einer `extents`-Kante, `bonusIsland` jenseits dieser Kante. Garantiert, dass alle Beats existieren und intentional sitzen.
3. **Pfade carven:** Polylines `spawn → jedes Zonenzentrum → secretRamp`; `breite = pfadBreite`. Diese Korridore werden beim Scatter freigehalten.
4. **Scatter:** je Zone nach `dichte`-Regel Breakables/Obstacles/Decor/Collectibles aus dem Asset-Kit ziehen (gefiltert per `themes`), Blue-Noise/Poisson-Disc-Platzierung mit `minAbstand`; Rotations- und Skalierungs-Jitter. Ablehnen, wenn Platzierung Pfade, Set-Pieces oder andere Entities (Footprint) überlappt.
5. **Validierung** (siehe 3.2) anhängen → `valid`, `warnungen`.

Gleicher Seed + gleiches Rezept ⇒ identische `KartenDaten`. Helfer `blauRauschen(...)` ist deterministisch (RNG-Parameter).

### 3.2 Validierung (rein)

`validiere(daten: KartenDaten): { valid: boolean; warnungen: string[] }` prüft Spielbarkeit:
- Erreichbarkeit: `spawn` erreicht jedes Pflicht-Set-Piece über freie Pfade.
- Spawn-Umkreis frei von Hindernissen/Hazards.
- Kein Hazard blockiert einen Pflicht-Pfad vollständig.
- Dichten in `[min,max]`; keine Entity-Überlappungen über Footprint.
Nicht-fatale Befunde landen in `warnungen` (Mapsmith zeigt sie an).

### 3.3 Gameplay-Entity-Logik (rein, wo möglich)

**Loot-Tabellen geben nie Impulse.** Erlaubt: Heilung, temporäre Toys, Deko/Flavor.

- **Breakable:** Zustand `{ hp }`; `treffen(state, dmg) → { hp, zerstoert, loot? }`. HP klein (1–2 Treffer). `loot` aus nicht-Impuls-Tabelle.
- **Hazard:** `hazardSchaden(typ) → number` (Spieler-HP-Schaden bei Kontakt); optional getaktet (z.B. Pressen-Zyklus) via `hazardAktivBeiKontakt(typ, t)`. Reines Ausweichen.
- **DormantNest:** Zustand `{ entdeckt, wach, rest }`; `pruefeEntdeckung(nest, playerPos, radius) → wach`; bei `rest===0` ⇒ Drop von `nestLebenDrop` HP-Pickups (Leben), **keine Impulse**. Die Nest-Gegner laufen über das bestehende Gegner-System, aber als Map-Nest markiert (HP-Drop statt Impuls-Drop).
- **Collectible:** `aufsammeln(typ) → effekt` (Heilung/Toy/Deko), nie Impulse.
- **Secret:** `rampenSchub(geschwindigkeit) → ausgeloest`; bei Auslösung ein Sprung-Bogen (kein Teleport) auf `bonusIsland`; Insel trägt Collectibles + ein Toy.

### 3.4 Loader (Engine)

`ladeKarte(scene, daten, kit): { update(); dispose() }` instanziiert pro `MapEntity` ein Platzhalter-Mesh aus `AssetDef.mesh` (Form/Größe/Farbe), positioniert/rotiert/skaliert und registriert die Gameplay-Hooks (Breakable-HP, Hazard-Volumen, Nest-Trigger, Collectible-Pickup, Secret-Rampe). `world/ground.ts` bleibt unverändert aktiv.

### 3.5 Mapsmith (Debug) & kuratierte Bibliothek

Toggle-Taste aktiviert den Modus: Rezept laden, `R` würfelt Seed neu (regenerieren + neu laden), freies Fahren zur Beurteilung, `S` speichert die aktuelle `{ rezeptId, seed }`: Ausgabe der `KuratierteKarte`-Zeile in Konsole + Zwischenablage und Ablage in `localStorage` (der Browser kann `curatedMaps.ts` nicht schreiben — der Entwickler fügt die Zeile dort ein). Seed + `warnungen` im HUD. Der Run liest `CURATED`, wählt eine Karte und baut sie über `generiere` deterministisch neu.

## 4. Komponenten / UI

- **Minimap** (`src/ui/minimap.ts`, `src/ui/minimapMath.ts`): Karten-Entities als Blips (Wahrzeichen, Nest, Falle, Secret, Funde) + Fog-of-War-Reveal beim Erkunden.
- **Mapsmith-Overlay** (Debug): Seed, Rezept-Id, Validierungs-Warnungen, Hinweise `R` reroll / `S` save. Nur im Debugmodus sichtbar.
- **Spieler-HP** nutzt die bestehende `src/ui/playerBar.ts`; Hazards senken HP, Heilung/Leben-Drops heben sie.

## 5. Implementierungsplan

### Phase 1: Typen, Tuning & Asset-Kit
**Dateien:** `src/world/map/mapTypes.ts` (neu), `src/world/map/mapTuning.ts` (neu), `src/world/map/assetKit.ts` (neu), `src/world/map/recipe.ts` (neu), `src/world/biomeRegistry.ts`
**Abhängigkeiten:** Keine
**Schritte:**
1. Typen aus Sektion 2 in `mapTypes.ts` anlegen (Vec2/Vec3, Zone, MapEntity, MapPath, KartenDaten).
2. `assetKit.ts` mit Registry (`registerAsset`/`getAsset`/`assetsByThemeCategory`) und einem generischen Start-Kit: je Kategorie mehrere Platzhalter-Teile mit `themes` und parametrischem `mesh` (siehe Sektion 2).
3. `recipe.ts` mit `Rezept`/`DichteRegel` und dem Rezept `schrottfeld` (4 Themen, Dichten, Pflicht-Set-Pieces `['landmark','dormantNest','hazard','secretRamp']`).
4. `mapTuning.ts` mit allen Zahlen aus Sektion 2/3 (Scatter, Jitter, Gameplay-Werte).
5. In `biomeRegistry.ts` das Biom `schrottfeld` registrieren (`groundColor`), damit `getBiome('schrottfeld')` nicht wirft.
**Testkriterium:** `npx tsc -b` grün; Vitest: Asset-Kit hat ≥3 Teile je Kategorie, Rezept `schrottfeld` existiert und referenziert nur registrierte Themen, `getBiome('schrottfeld')` wirft nicht.

### Phase 2: Generator & Validierung (rein)
**Dateien:** `src/world/map/generator.ts` (neu), `src/world/map/validator.ts` (neu), `src/world/map/generator.test.ts` (neu)
**Abhängigkeiten:** Phase 1
**Schritte:**
1. `blauRauschen`-Helfer + `generiere(rezept, seed)` mit den 5 Schritten aus Sektion 3.1, RNG aus `src/core/rng.ts`.
2. `validiere(daten)` nach Sektion 3.2 in `validator.ts`; aus `generiere` aufrufen und `valid`/`warnungen` setzen.
3. Tests: Determinismus, Pflicht-Set-Pieces vorhanden, keine Überlappungen, Pfade verbinden Spawn→Set-Pieces, Validierung besteht, verschiedene Seeds ⇒ messbar andere Layouts.
**Testkriterium:** `npx vitest run src/world/map/generator.test.ts` grün; gleicher Seed liefert identische `KartenDaten`.

### Phase 3: Loader & Platzhalter-Meshes
**Dateien:** `src/world/map/loader.ts` (neu), `src/world/map/mapMesh.ts` (neu), `src/main.ts`
**Abhängigkeiten:** Phase 2
**Schritte:**
1. `mapMesh.ts`: aus `AssetDef.mesh` ein Babylon-Platzhalter-Mesh bauen (Form/Größe/Farbe).
2. `loader.ts`: `ladeKarte(scene, daten, kit)` instanziiert alle Entities (Sektion 3.4), `update()`/`dispose()`.
3. In `src/main.ts` beim Run-Start eine Karte generieren und laden; `world/ground.ts` bleibt aktiv.
**Testkriterium:** `npm run build` grün; Karte erscheint (Meshes an Entity-Positionen, Boden bleibt) — Sichtprüfung durch Fahren.

### Phase 4: Breakables, Hazards, Collectibles
**Dateien:** `src/world/map/mapEntities.ts` (neu), `src/world/map/mapEntities.test.ts` (neu), `src/world/map/loader.ts`, `src/main.ts`
**Abhängigkeiten:** Phase 3
**Schritte:**
1. Reine Logik aus Sektion 3.3 für Breakable/Hazard/Collectible in `mapEntities.ts` (Loot-Tabellen ohne Impulse).
2. In `loader.ts` die Hooks verdrahten (Treffer auf Breakable, Hazard-Kontakt → Spieler-HP, Collectible-Pickup).
3. Tests: Breakable nach HP zerstört + Loot ist nie Impuls; Hazard senkt HP bei Kontakt; Collectible heilt/gibt Toy, nie Impuls.
**Testkriterium:** `npx vitest run src/world/map/mapEntities.test.ts` grün; im Spiel: Fass beschießen → zerplatzt; in Falle fahren → HP sinkt.

### Phase 5: Schlafende Nester (Entdeckung → Leben)
**Dateien:** `src/world/map/dormantNest.ts` (neu), `src/world/map/dormantNest.test.ts` (neu), `src/world/map/loader.ts`, `src/main.ts`
**Abhängigkeiten:** Phase 4
**Schritte:**
1. Nest-Logik aus Sektion 3.3 (`pruefeEntdeckung`, Restzähler, Leben-Drop) in `dormantNest.ts`.
2. In `main.ts`/`loader.ts` Nest-Gegner über das bestehende Gegner-System spawnen, als Map-Nest markiert (HP-Drop statt Impuls).
3. Tests: Aktivierung erst im Entdeckungs-Radius; bei Räumung Drop von Leben, **keine Impulse**.
**Testkriterium:** `npx vitest run src/world/map/dormantNest.test.ts` grün; im Spiel: Nest nähern → Gegner erwachen → räumen → HP-Pickups, kein Impuls.

### Phase 6: Secret-Rampe → Bonus-Insel
**Dateien:** `src/world/map/secret.ts` (neu), `src/world/map/secret.test.ts` (neu), `src/world/map/loader.ts`, `src/main.ts`
**Abhängigkeiten:** Phase 5
**Schritte:**
1. `rampenSchub`/Auslöse-Logik aus Sektion 3.3 in `secret.ts`.
2. In `loader.ts`/`main.ts` Rampe → Sprung-Bogen auf `bonusIsland`; Insel mit Collectibles + einem Toy bestücken.
3. Tests: Auslösung ab Schub-Schwelle; Insel-Inhalt vorhanden, nie Impulse.
**Testkriterium:** `npx vitest run src/world/map/secret.test.ts` grün; im Spiel: Rampe treffen → auf Insel landen.

### Phase 7: Mapsmith-Debugmodus & kuratierte Bibliothek
**Dateien:** `src/world/map/mapsmith.ts` (neu), `src/world/map/curatedMaps.ts` (neu), `src/main.ts`, `src/ui/mapsmithHud.ts` (neu)
**Abhängigkeiten:** Phase 6
**Schritte:**
1. `curatedMaps.ts` mit `KuratierteKarte`/`CURATED` (Sektion 2).
2. `mapsmith.ts`: Toggle, `R` reroll (regenerieren+laden), `S` save (Konsole + Zwischenablage + `localStorage`, siehe Sektion 3.5), Seed/Warnungen liefern.
3. `mapsmithHud.ts` zeigt Seed, Rezept, Validierungs-Warnungen, reroll/save-Hinweise (nur Debug).
**Testkriterium:** `npm run build` grün; Debug-Toggle → `R` baut neue Karte, `S` schreibt Eintrag, HUD zeigt Seed/Warnungen.

### Phase 8: Run-Integration & Minimap-Reveal
**Dateien:** `src/main.ts`, `src/ui/minimap.ts`, `src/ui/minimapMath.ts`
**Abhängigkeiten:** Phase 7
**Schritte:**
1. Run-Start wählt eine `CURATED`-Karte und baut sie deterministisch (`generiere` → `ladeKarte`).
2. Minimap zeigt Karten-Entity-Blips + Fog-of-War-Reveal beim Erkunden (Sektion 4).
3. Prüfen, dass Gegner-Spawn (`gartenProgression`) und Impuls-Fluss unverändert sind (Invariante Sektion 1).
**Testkriterium:** `npx tsc -b`, `npx vitest run`, `npm run build` grün; Run startet auf kuratierter Karte; Minimap-Reveal funktioniert; keine Änderung an Spawn-Rate/Impulsen.

### Zusammenfassung

- **Phase 1:** Typen, Tuning und generisches Asset-Kit + Rezept `schrottfeld`.
- **Phase 2:** Deterministischer Generator (Zonen/Set-Pieces/Scatter/Pfade) + Validierung, rein getestet.
- **Phase 3:** Loader instanziiert Platzhalter-Meshes; Karte erscheint im Spiel.
- **Phase 4:** Breakables, Hazards, Collectibles — Logik + Verdrahtung, Loot nie Impulse.
- **Phase 5:** Schlafende Nester wachen bei Entdeckung auf und droppen Leben.
- **Phase 6:** Secret-Rampe katapultiert auf die Bonus-Insel.
- **Phase 7:** Mapsmith-Debugmodus (reroll+save) + kuratierte Bibliothek.
- **Phase 8:** Run-Integration auf kuratierten Karten + Minimap-Fog-of-War.
