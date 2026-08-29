# Feldgefuehrter Hybrid-Kartengenerator

**Status:** vom Nutzer inhaltlich freigegebene Zielarchitektur  
**Datum:** 2026-08-29  
**Projekt:** ChaosTankNew

## 1. Ausgangslage

Der aktuelle Kartengenerator verteilt eine feste Modulliste zufaellig auf einer grossen Flaeche und verbindet die Module anschliessend mit einem minimalen Spannbaum aus L-foermigen Strassen. Ein Seed veraendert dadurch vor allem Positionen, Drehungen und Spiegelungen, aber nicht die grundlegende raeumliche Sprache der Karte. Kleine gestaltete Inseln stehen in einer ueberwiegend unstrukturierten Grundflaeche. Die vorhandenen Tests beweisen Determinismus, Grenzen und Erreichbarkeit, messen aber keine Kartenkomposition.

Der bisherige Generator wird vollstaendig ersetzt. Es gibt keinen Legacy-Modus, keinen Umschalter, keinen Parallelbetrieb und keinen Fallback auf alte Generationslogik. Neutrale Laufzeitbausteine wie Assetdefinitionen oder Renderer duerfen weiterverwendet oder angepasst werden, sofern sie keine alte Generationsentscheidung konservieren.

## 2. Ziel

Ein Seed soll eine zusammenhaengende, befahrbare und wiedererkennbare Schrottlandschaft erzeugen. Wenige globale Ursachen bestimmen die gesamte Karte. Jede Generationsstufe erzeugt Bedingungen fuer die folgende Stufe:

```text
Seed
-> Weltcharakter
-> konkrete Makrostruktur
-> raeumliche Felder
-> gewachsene Regionen
-> geeignete Sites
-> landschaftsbewusster Explorationsgraph
-> geroutete Korridore
-> raeumliche Reservierungen
-> lokale Landschaftskompositionen
-> validierte Graybox-Welt
```

Die Karte bleibt offen und verwendet keine Isaac-artigen Raeume. Der spaetere Isaac-Bezug entsteht durch kontrollierte Moeglichkeitsverteilung, Entdeckung, Sites, Events, Nester, Secrets und Belohnungen. Diese Inhalte sind nicht Teil der ersten Generatorfassung.

## 3. Verbindliche Grundsaetze

1. Die Landschaft entsteht vor dem Graphen. Der Graph organisiert Exploration und Erreichbarkeit, diktiert aber weder Felder noch Biome.
2. Biome werden nicht als Ellipsen oder zufaellige Flecken platziert. Sie werden aus Eignungswerten zusammenhaengend gewachsen.
3. Gameplayrelevante Geometrie wird nicht allgemein gestreut. Sie entsteht aus lokalen Kompositionsregeln.
4. Der Generator erzeugt abstrakte Landschaftsmerkmale. Konkrete Assets werden erst spaeter passend aufgeloest.
5. Jede Stufe ist rein und deterministisch. Sie veraendert keine Ausgabe einer vorherigen Stufe.
6. Jede Stufe garantiert ihre eigenen Invarianten. Der abschliessende Validator liest nur und repariert nichts.
7. Ein ungueltiger Seed wird nicht heimlich neu gewuerfelt. Ein nicht reparierbarer Fehler beendet die Generierung mit einer diagnostischen Ausnahme.
8. Getrennte RNG-Stroeme verhindern, dass neue Assets oder spaetere Inhalte die Geografie bestehender Seeds veraendern.

## 4. Pipeline und Modulgrenzen

```text
seedStreams
-> worldDNA
-> macroStructure
-> worldFields
-> derivedPotentials
-> activeBiomeSet
-> regionGenerator
-> siteGenerator
-> terrainCostGraph
-> traversalGraph
-> siteRoleResolver
-> pathRouter
-> spatialReservations
-> landscapeGenerator
-> worldValidator
-> grayboxResolver
-> RuntimeKarte
```

Vorgesehene Quelldateien unter `src/world/map/`:

- `worldGenerator.ts`: orchestriert die Stufen, enthaelt aber keine Generationsalgorithmen.
- `worldTypes.ts`: Generatorinternes Weltmodell und stabile IDs.
- `seedStreams.ts`: gelabelte, stabile RNG-Stroeme.
- `worldDNA.ts`: globale Weltidentitaet.
- `macroStructure.ts`: konkrete grossraeumige Geografie eines Seeds.
- `worldGrid.ts`: Griddefinitionen, Indexierung, Sampling und Nachbarschaften.
- `worldFields.ts`: geographische Grundfelder und abgeleitete Potentiale.
- `regionGenerator.ts`: aktive Biome, Regionswachstum und Regionsnormalisierung.
- `siteGenerator.ts`: raeumlich geeignete Sites ohne vorweggenommene Graphrollen.
- `traversalGraph.ts`: kostenbewertete Kandidaten, MST und gezielte Zusatzkanten.
- `siteRoleResolver.ts`: aus der Graphstruktur abgeleitete topologische Rollen.
- `pathRouter.ts`: feines Routing und kanonische Korridore.
- `spatialReservations.ts`: typisierte Schutz- und Freiraeume.
- `landscapeGrammar.ts`: abstrakte Features, Patterns und Assetvertrag.
- `landscapeGenerator.ts`: lokale Kompositionen von gross nach klein.
- `worldValidator.ts`: ausschliesslich lesende Invarianten- und Qualitaetspruefung.
- `grayboxResolver.ts`: sichtbare Primitive fuer die erste Entwicklungsfassung.

Kleine, klar zusammengehoerige Typen duerfen waehrend der Implementierung zusammengelegt werden. Die fachlichen Grenzen bleiben jedoch erhalten.

## 5. Weltmodell und Runtime-Projektion

Das Generatorergebnis erbt nicht vom alten `KartenDaten`-Modell:

```ts
interface GenerierteWelt {
  seed: number;
  extents: Extents;
  dna: WorldDNA;
  macro: MacroStructure;
  fields: WorldFields;
  regions: RegionMap;
  sites: Site[];
  graph: TraversalGraph;
  corridors: RoutedCorridor[];
  reservations: SpatialReservation[];
  features: LandscapeFeature[];
  debug: WorldDebugData;
}
```

Der `grayboxResolver` projiziert diese Welt in ein separates Runtimeformat fuer Loader und Renderer. Dieses Runtimeformat enthaelt nur Daten, die das laufende Spiel benoetigt. Alte Generatorbegriffe wie eine einzelne globale `biomeId`, frei platzierte `zones` oder zweipunktige `paths` werden nicht in das neue Weltmodell uebernommen.

## 6. Stabile RNG-Stroeme

Jede fachliche Stufe erhaelt einen eigenen Seed durch einen stabilen Hash aus Weltseed und Label:

```text
hash(seed, "dna")
hash(seed, "macro")
hash(seed, "fields")
hash(seed, "regions")
hash(seed, "sites")
hash(seed, "graph")
hash(seed, "routing")
hash(seed, "landscape")
hash(seed, "visuals")
```

Das Hinzufuegen einer neuen visuellen Assetvariante darf Regionen, Sites, Graph oder Korridore desselben Seeds nicht veraendern. Die Hashfunktion und alle Labels werden durch Determinismustests festgeschrieben.

## 7. Zwei getrennte Raster

Makrofelder und Routing verwenden getrennte Griddefinitionen:

```text
FieldGrid:      80 x 64,   10 Welteinheiten pro Zelle
TraversalGrid: 160 x 128,   5 Welteinheiten pro Zelle
```

Beide Raster decken bei den aktuellen Extents dieselbe Weltflaeche von 800 x 640 Welteinheiten ab. Typen und Funktionen duerfen niemals stillschweigend annehmen, dass beide Raster identisch sind. Das TraversalGrid liest Feldwerte durch bilineares Sampling aus dem FieldGrid.

Die Rastergroessen sind Generatoroptionen mit diesen Werten als verbindlichen Defaults. Kartenextents muessen ohne abgeschnittene Randzellen abbildbar sein.

## 8. WorldDNA

Die WorldDNA beantwortet ausschliesslich: "Wie ist diese Welt grundsaetzlich?" Sie enthaelt keine Koordinaten und keine Einflusszentren.

Die vier weitgehend unabhaengigen Grundachsen sind:

```ts
interface WorldDNA {
  openness: number;
  industrialization: number;
  destruction: number;
  wetness: number;
  axisStrength: number;
  structuralDensity: number;
  targetRegionScale: number;
  roadDensity: number;
  clusterStrength: number;
}
```

Alle Werte liegen zwischen 0 und 1. Die vier Grundachsen werden unabhaengig erzeugt, damit beispielsweise intakte Hochindustrie, zerfallene Hochindustrie, offene Feuchtigkeit oder dichte Trockenheit moeglich bleiben. Die abgeleiteten Werte werden anschliessend aus diesen Ursachen korreliert. So entstehen Zusammenhaenge, ohne moegliche Weltidentitaeten kuenstlich zu reduzieren.

## 9. MacroStructure

`MacroStructure` beantwortet: "Wo liegen die wenigen grossraeumigen Ursachen dieses Seeds?"

Sie enthaelt:

- eine Hauptachse als Winkel und Staerke,
- zwei bis vier Einflusszentren,
- grossraeumige Gradientrichtungen,
- Schwerpunkte fuer offene, industrielle, feuchte und zerstoerte Landschaft,
- radiale Reichweiten und anisotrope Ausrichtungen der Einfluesse.

Einflusszentren werden nicht frei mit `random(x,z)` verteilt. Ein grobes 3-x-3-Makroraster liefert verschobene Kandidaten. Das erste Zentrum folgt DNA und Hauptachse; weitere Zentren bevorzugen ausreichenden Abstand, Achsenbezug und Kartenabdeckung. Die konkrete Anzahl wird aus Regionsmassstab und Strukturdichte abgeleitet.

## 10. Grundfelder und abgeleitete Potentiale

Das FieldGrid besitzt nur vier geographische Grundfelder:

```text
openness
industrial
wetness
destruction
```

Jedes Feld entsteht aus normalisiertem niedrigfrequentem mehrstufigem Value Noise, dem passenden DNA-Level und Einfluessen aus der MacroStructure:

```text
normalizedNoise + DNA-Level + MacroInfluence -> clamp(0, 1)
```

Nur der rohe Noise wird normalisiert. Das fertige Feld wird niemals pro Karte auf seinen jeweiligen Minimal- und Maximalwert gestreckt. Eine Karte mit niedriger Industrialisierung darf dadurch kein kuenstlich auf 1 skaliertes Industriegebiet erhalten.

Aus den vier Grundfeldern entstehen deterministisch abgeleitete Potentiale, unter anderem:

```text
scrapPotential
buildingPotential
ruinPotential
mudPotential
craterPotential
```

`danger` ist kein geographisches Grundfeld. Gefahr wird spaeter aus Topologie, Entfernung, Content und Runprogression abgeleitet.

## 11. Aktive Biome und Regionen

Moegliche Biome der ersten Fassung sind:

- offene Oednis,
- Schrottfeld,
- Industrie,
- Schlamm,
- Ruinen,
- Krater.

Nicht jedes Biom muss in jedem Seed erscheinen. Zunaechst wird aus DNA und globaler Eignung ein `activeBiomeSet` bestimmt. Nur ausreichend relevante Biome erhalten Wachstumssamen. Offene Oednis bleibt der verbindende Grundtyp; extreme DNA-Profile duerfen bewusst nur wenige weitere Biome aktivieren.

Fuer jedes aktive Biom wird pro Zelle eine Eignung aus Grundfeldern, Potentialen und Nachbarschaftsregeln berechnet. Weit auseinanderliegende lokale Maxima werden zu Regionskeimen. Ein gewichtetes Multi-Source-Flood-Fill laesst Regionen zusammenhaengend wachsen. Nachbarschaftsregeln beeinflussen die Kosten, damit plausible Uebergaenge wahrscheinlicher werden.

Der `regionGenerator` normalisiert sein eigenes Ergebnis deterministisch:

- zu kleine Regionsinseln werden mit dem am besten geeigneten Nachbarn verschmolzen,
- nicht zusammenhaengende Teile erhalten unterschiedliche `regionId`s,
- jede Zelle erhaelt genau eine `regionId`,
- jede Region besitzt genau eine `biomeId`.

Mehrere getrennte Regionen duerfen dasselbe Biom besitzen.

## 12. Sites

Der erste Pass erzeugt sieben bis elf raeumlich geeignete Sites. Der Spawn bleibt in der ersten Fassung am Ursprung und wird als vollstaendige Site behandelt. Weitere Sites entstehen aus bewerteten Kandidaten, die Mindestabstaende zu Spawn, Kartenrand und anderen Sites einhalten.

Der `siteGenerator` vergibt noch keine Rollen wie Sackgasse oder Hub. Er beschreibt nur raeumliche Eignung, Groesse und moegliche lokale Site-Archetypen. Rollen, die erst aus einem Graphen hervorgehen, duerfen nicht vorweggenommen werden.

Die Kandidatenauswahl besitzt begrenzte Versuche. Ein ungeeigneter Kandidat wird innerhalb dieser Stufe deterministisch durch den naechstbesten Kandidaten ersetzt.

## 13. Landschaftsbewusster TraversalGraph

Bei sieben bis elf Sites werden alle Site-Paare als Kandidaten betrachtet. Eine Kante wird nicht nur nach Luftlinie bewertet. Grobes A* auf dem FieldGrid schaetzt die tatsaechliche Durchquerungskosten:

```text
edgeCost = routeDistance + sampledTerrainCost + transitionCost
```

Terrainkosten beruecksichtigen vor allem geringe Offenheit, Feuchtigkeit, Zerstoerung und Regionsuebergaenge. Die Gewichtungen sind zentral in den Generatoroptionen definiert und nicht ueber Algorithmen verteilt.

Aus dem kostenbewerteten Kandidatengraphen entstehen:

1. ein Minimum-Spanning-Tree fuer garantierte Erreichbarkeit,
2. ein aus `roadDensity` abgeleitetes Budget von ein bis drei Zusatzkanten,
3. moeglichst kurze Zusatzkanten ohne uebermaessige Knotengrade,
4. bewusst erhaltene Sackgassen.

Der Graph veraendert keine Felder und keine Regionen. Er waehlt lediglich unter landschaftlich unterschiedlich teuren Verbindungen.

## 14. Site-Rollen

Nach dem Graphbau leitet `siteRoleResolver` ausschliesslich topologische Rollen ab:

```text
hub
deadEnd
loopNode
peripheral
remote
```

`remote` wird aus der gewichteten kuerzesten Wegdistanz vom Spawn abgeleitet, nicht aus Luftlinie. Diese Rollen sind spaetere Eingaben fuer Site-Archetypen, Secrets und den ContentDirector. Gefahr und Belohnungswert gehoeren noch nicht in diese Stufe.

## 15. Geroutete Korridore

Jede ausgewaehlte Graphkante wird mit A* auf dem TraversalGrid geroutet. Die Routingkosten sampeln die geographischen Felder und beruecksichtigen:

- Terrainkosten,
- Regionsuebergaenge,
- Richtungswechsel,
- bereits vorhandene Korridore,
- Schutzabstaende zu ungeeigneten Sites und Kartenrand.

Vorhandene Korridore werden leicht bevorzugt, damit gemeinsame Hauptachsen und echte Kreuzungen entstehen. Ein Wiederverwendungslimit verhindert, dass alle Routen in einem einzigen Stamm verschmelzen.

Das kanonische Ergebnis ist nicht das Rasterformat des aktuellen Strassenrenderers:

```ts
interface RoutedCorridor {
  id: CorridorId;
  fromSiteId: SiteId;
  toSiteId: SiteId;
  centerline: Vec2[];
  width: number;
  cells: TraversalCellIndex[];
}
```

Die Centerline und Breite sind die Weltlogik. Ein Renderer darf daraus fuer die aktuelle Darstellung Strassenzellen ableiten. Spaetere Spline- oder Biom-spezifische Wegrenderer erfordern keine Aenderung am Generatorvertrag.

## 16. SpatialReservations

Freizuhaltende Flaechen werden typisiert:

```ts
type ReservationType =
  | 'spawn'
  | 'site'
  | 'corridor'
  | 'junction'
  | 'clearing';
```

Eine `SpatialReservation` enthaelt Geometrie, Typ, Schutzabstand und erlaubte Feature-Rollen. Der Landschaftsgenerator darf je nach Typ unterschiedlich reagieren:

- Spawn: grosser vollstaendig blockierungsfreier Bereich.
- Site: Kernbereich frei; passende Komposition darf sich auf die Site beziehen.
- Corridor: Fahrraum frei; Randstrukturen sind erlaubt.
- Junction: zusaetzlicher Sicht- und Wenderaum.
- Clearing: bewusst negativer Raum als Teil der Komposition.

Negativer Raum ist keine geometrische Patternart. Ein Pattern darf positive Features und zusaetzlich reservierten negativen Raum erzeugen.

## 17. Generierungs- und Asset-Grammatik

Der Generator erzeugt abstrakte Landschaftsmerkmale statt konkreter Asset-IDs:

```ts
interface LandscapeFeature {
  id: FeatureId;
  biomeId: BiomeId;
  regionId: RegionId;
  shape: 'point' | 'line' | 'arc' | 'blob' | 'edge';
  size: 'small' | 'medium' | 'large';
  traversal: 'blocking' | 'destructible' | 'driveable';
  role: 'landmark' | 'filler' | 'border' | 'cover' | 'clearing-anchor';
  placementMode: 'single' | 'cluster' | 'line' | 'border' | 'site';
  footprint: Footprint;
  clearance: number;
  position: Vec2;
  rotation: number;
}
```

`LandscapeFeature.footprint` ist die autoritative maximale Kollisionshuelle. Ein aufgeloestes Asset muss mit seiner `blockingShape` vollstaendig innerhalb dieser Huelle liegen. Ein rein visueller Assetwechsel darf niemals einen zuvor befahrbaren Korridor blockieren.

Ein Asset beschreibt seine Eignung durch:

```ts
interface AssetArchetype {
  id: string;
  category: string;
  footprint: Footprint;
  blockingShape: Footprint;
  allowedBiomes: BiomeId[];
  placementModes: PlacementMode[];
  traversal: TraversalType;
  clearance: number;
  allowedRotations: number[];
  tags: string[];
}
```

Der spaetere `assetResolver` darf nur passende Assets waehlen. Seine Auswahl verwendet den RNG-Strom `visuals` und veraendert keine Weltstruktur.

## 18. Lokale Landschaftskomposition

Jedes Biom besitzt ein `LandscapeRecipe`. Es definiert keine Anzahl einzelner Objekte, sondern raeumliche Regeln:

- Cluster: kompakt, offen oder ringfoermig,
- Linien: Reihen entlang von Achsen, Wegen oder Feldgradienten,
- Boegen: Teilumfassungen und gebrochene Raume,
- Blobs: grosse unregelmaessige Strukturen,
- Edges: Kompositionen entlang von Regionsgrenzen,
- Islands: kleine freistehende Gruppen.

Die Generierung erfolgt von gross nach klein:

```text
grosse Kompositionen
-> Grenzen und Linien
-> mittlere Cluster
-> kleine Fuellstrukturen
-> rein visuelle Dekoration
```

Feldgradienten, Regionsgrenzen, Korridore, Sites und bestehende grosse Kompositionen beeinflussen nachfolgende Regeln. Ein Belegungsraster und die SpatialReservations verhindern Kollisionen und blockierte Fahrwege.

Erste raeumliche Sprachen:

- Schrottfeld: Blob-Cluster, Schrottinseln und offene Innenraeume.
- Industrie: Reihen, Linien, rechte Winkel und grosse Hoefe.
- Schlamm: wenige feste Blocker, weiche Inseln und breite Passagen.
- Ruinen: gebrochene Linien, Teilraeume, Boegen und Luecken.
- Krater: ringfoermige Strukturen, unregelmaessige Raender und freie Zentren.
- Offene Oednis: Landmarken, kleine Inseln und bewusst viel negativer Raum.

Ein allgemeines `scatter()` fuer kollidierende oder gameplayrelevante Geometrie existiert nicht. Spaetere rein visuelle Kleindekoration darf separat gestreut werden.

## 19. Graybox vor finalen Assets

Die erste vollstaendige Fassung verwendet ausschliesslich einfache Primitive:

- Kreise fuer Cluster,
- Rechtecke fuer Gebaeude und Blocker,
- Linien fuer Reihen und Grenzen,
- farbige Flaechen fuer Regionen und Reservierungen,
- abgeleitete Strassenzellen fuer Korridore.

Erst wenn mindestens zwanzig Graybox-Seeds bereits ohne echte Assets unterschiedlich, zusammenhaengend und sinnvoll befahrbar wirken, wird eine kleine echte Assetfamilie integriert. Diese erste Familie umfasst nur genug Material, um Grammatik und Resolver real zu pruefen. Generatorregeln und Assetfamilien werden danach gemeinsam erweitert.

## 20. Verantwortung der Stufen und Fehlerbehandlung

Jede Stufe garantiert und normalisiert ihr eigenes Ergebnis:

- `regionGenerator` verschmilzt eigene Kleinstregionen.
- `siteGenerator` ersetzt eigene ungeeignete Kandidaten.
- `traversalGraph` garantiert einen verbundenen Graphen.
- `pathRouter` garantiert Breite und Durchgaengigkeit seiner Korridore.
- `landscapeGenerator` respektiert Reservations bereits beim Erzeugen.

Alle Such- und Reparaturschritte besitzen feste Versuchslimits. Es gibt keine Endlosschleifen und kein Neuwuerfeln mit einem anderen Seed.

`worldValidator` liest ausschliesslich. Bei einer verletzten harten Invariante wirft `worldGenerator` einen `WorldGenerationError`, der mindestens Seed, Stufe, Invariant und kompakte Diagnosedaten enthaelt. Es gibt keinen Legacy-Fallback.

## 21. Validierung

Harte Invarianten:

- Jede FieldGrid-Zelle besitzt alle Grundfelder, eine `regionId` und eine `biomeId`.
- Jede Region ist zusammenhaengend und besitzt genau ein Biom.
- Jede Site liegt innerhalb der Extents und respektiert ihre Mindestabstaende.
- Der Graph ist vom Spawn aus vollstaendig erreichbar.
- Schleifenbudget und maximale Knotengrade werden eingehalten.
- Jede Graphkante besitzt genau einen befahrbaren Korridor.
- Korridore, Spawn und harte Reservations sind frei von blockierenden Features.
- Alle Feature-Footprints liegen vollstaendig innerhalb der Karte.
- Eine Flood-Fill-Pruefung auf dem TraversalGrid erreicht vom Spawn aus jede Site.
- Gleicher Seed und gleiche Optionen erzeugen bytegleich serialisierbare Generatorergebnisse.

Neutrale Qualitaetsmetriken:

- Biom- und Regionsflaechen,
- Anteil komponierter Landschaft,
- groesste Flaeche ohne Landschaftskomposition,
- laengster Korridorabschnitt ohne Site oder Kreuzung,
- maximale gewichtete Entfernung zur naechsten Site,
- durchschnittliche Site-Distanz,
- Anzahl von Schleifen, Sackgassen und Knotengraden,
- Korridorlaengen, gemeinsame Achsen und Richtungswechsel,
- Clusterverteilung und Wiederholungsrate.

Die Metrik behauptet noch nicht, ob ein Abschnitt spielerisch bedeutungslos ist. Diese Bewertung ist erst nach ContentDirector, Events und Belohnungen moeglich.

## 22. Tests und Abnahme

Automatische Tests:

- Unit-Tests fuer jede reine Generationsstufe.
- Tests fuer Hashlabels und getrennte RNG-Stroeme.
- Tests fuer FieldGrid-/TraversalGrid-Umrechnung und Interpolation.
- Regionskontiguitaet und aktive Biome.
- kostenbewerteter MST, Schleifenbudget und Site-Rollen.
- A*-Routing, Korridorbreite und Reservationen.
- Feature-Footprints und Asset-Envelope-Vertrag.
- lesender Validator ohne Seiteneffekte.
- Eigenschaftstests ueber mindestens 500 Seeds.
- vollstaendiger Projekt-Testlauf und Produktionsbuild.

Visuelle und spielerische Graybox-Abnahme:

- mindestens zwanzig Seeds im Mapsmith,
- gezielte offene, dichte, industrielle, zerstoerte und feuchte Extremprofile,
- alle Sites mit dem Panzer erreichbar,
- erkennbare Regionen und Hauptachsen,
- alternative Wege und bewusste Sackgassen,
- keine zufaelligen Prop-Inseln in ueberwiegend unstrukturierter Leere,
- keine sichtbaren Rasterartefakte, die aus der Makrodistanz dominieren.

Mapsmith zeigt schaltbare Ebenen fuer WorldDNA, MacroStructure, Grundfelder, Potentiale, aktive Biome, Regionen, Sites, kostenbewerteten Graph, Korridore, Reservations, Feature-Footprints und Validierungsdiagnosen.

## 23. Runtime-Integration und Entfernung der Altlogik

`main.ts` ruft ausschliesslich `generiereWelt` auf. Der regionsbasierte Bodenrenderer ersetzt die rechteckigen Modulboeden. Der Strassenrenderer konsumiert `RoutedCorridor` und leitet seine momentanen Rastertiles selbst daraus ab. Loader, Kollision und Mapsmith werden auf das neue Runtimeformat umgestellt.

Folgende Generationspfade werden entfernt, sobald ihre neue Entsprechung integriert ist:

- `cityGen.ts` und Tests,
- `modulePlacement.ts` und Tests,
- `moduleRoads.ts` und Tests,
- `moduleStamp.ts`,
- der alte `generator.ts` und Tests,
- alte Validator-, Rezept- und Tuningteile, sofern sie nach einer Referenzsuche nur dem alten Generator dienen,
- nicht mehr verwendete Muster- und Modulkatalogdateien.

Brauchbare handgebaute Muster duerfen spaeter als lokale `SiteArchetype`-Daten neu modelliert werden. Sie bleiben nicht als versteckter zweiter Generatorpfad bestehen.

## 24. Nicht Teil dieser Fassung

- Events und Event-Sockets,
- Nester und Gegnerbudgets,
- Loot, Upgrades und Secrets,
- Gefahr- und Belohnungsprogression,
- finale Assetproduktion,
- Bossplatzierung,
- vollstaendige SiteArchetype-Bibliothek.

Die Architektur laesst spaeter zwischen `landscapeGenerator` und Runtimeprojektion einen `contentDirector` zu. Er darf die validierte Geografie nutzen, aber nicht rueckwirkend neu erzeugen.

## 25. Implementierungsreihenfolge auf hoher Ebene

1. Weltmodell, Raster und RNG-Stroeme.
2. WorldDNA, MacroStructure, Felder und Potentiale.
3. Aktive Biome und Regionswachstum.
4. Sites, kostenbewerteter Graph und Site-Rollen.
5. feines Routing und SpatialReservations.
6. Landschaftsgrammatik und Graybox-Kompositionen.
7. lesender Validator und Eigenschaftstests.
8. Runtimeprojektion, Renderer und Mapsmith-Debugebenen.
9. Entfernung saemtlicher alter Generatorpfade.
10. Graybox-Abnahme ueber mindestens zwanzig Seeds.

Jeder Schritt wird testgetrieben umgesetzt. Produktionscode fuer eine neue Stufe entsteht erst nach einem fehlschlagenden Test fuer deren vereinbartes Verhalten.
