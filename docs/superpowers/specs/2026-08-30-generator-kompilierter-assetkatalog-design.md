# Generator-kompilierter Assetkatalog und erstes WorldStyleKit

**Datum:** 2026-08-30  
**Projekt:** ChaosTankNew  
**Status:** verbindliches Design fuer den ersten Asset-Vertikalschnitt

## 1. Ausgangslage

Der feldgefuehrte Hybridgenerator erzeugt bereits deterministische Regionen, Sites, Korridore, Reservations und abstrakte `LandscapeFeature`s. Die sichtbare Runtimeprojektion loest diese Merkmale derzeit ueber eine allgemeine `AssetDef`-Registry in farbige Primitive auf. Der Boden verwendet Biomfarben; Strassen werden als Ribbon mit einer einzigen Textur gerendert. Damit ist die Geografie vorhanden, aber noch keine zusammenhaengende Assetwelt.

Der Generator besitzt bereits einen grossen Teil der mathematischen Information, aus der sich sein Assetbedarf ableiten laesst. Diese Information ist noch nicht als geschlossene, kompilierbare Generierungsgrammatik modelliert. Insbesondere beschreibt ein Merkmal wie `industrial + line + large + blocking + border` noch nicht, ob es eine Hallenfassade, Fabrikmauer oder Rohrtrasse verlangt.

## 2. Ziel

Die Generierungsgrammatik wird zur alleinigen Quelle des mathematisch moeglichen Assetbedarfs. Aus ihr entsteht automatisch ein versionierter Pflichtkatalog. Ein konkretes `WorldStyleKit` darf zur Laufzeit nur verwendet werden, wenn es diesen Katalog vollstaendig und widerspruchsfrei erfuellt.

Der erste reale Vertikalschnitt umfasst eine gemeinsame Bildsprache fuer:

- Industrie- und Schrottbiom,
- den Uebergang Industrie zu Schrott,
- eine gemeinsame Strassenfamilie,
- je einen kleinen Industrie- und Schrott-Site-Archetyp,
- passende Boeden, Gebaeude, Hindernisse, Schrottobjekte und Decals,
- technische Coverage und eine visuelle Pruefausgabe.

Es gibt keinen zweiten Kartengenerator, keinen Legacy-Generator, keinen stillen Assetfallback und keine spontane Assetproduktion durch einen einzelnen Runtime-Seed.

## 3. Verbindliche Grundsaetze

1. Die Geografie bleibt autoritativ: Felder, Regionen, Graph, Korridore, Reservations und Feature-Huellen werden nicht durch visuelle Assets veraendert.
2. Die Generierungsgrammatik bestimmt den Katalog. Ein Seed-Korpus misst nur Erreichbarkeit, Haeufigkeit und visuelle Wirkung.
3. Der Generator erzeugt semantische `demandClass`-Werte, niemals konkrete Assetdateien.
4. Ein Run verwendet genau ein globales `WorldStyleKit`. Unterkits oder Einzelvarianten aus anderen Stilen duerfen nicht eingemischt werden.
5. Ein Asset wird als Teil einer Familie produziert und freigegeben. Einzelne, isoliert erzeugte Dateien werden nicht direkt registriert.
6. Technische Kompatibilitaet und kuenstlerische Harmonie sind getrennte Gates. Beide muessen bestanden werden.
7. Kollisionshuellen und Fahrwege stammen aus dem abstrakten Weltmodell. Sichtbare Pixel oder Meshdetails duerfen sie nicht nachtraeglich vergroessern.
8. Kontinuierliche Geometrie wird parametrisch beschrieben. Es werden keine unendlichen Assetlisten fuer beliebige Winkel oder Laengen erzeugt.

## 4. Darstellungsmodell

ChaosTank verwendet fuer die Welt einen 2,5D-Hybrid:

- Boden, Strassen, Biomuebergaenge, Schmutz und Schaeden sind nahtlose Texturen oder Decals auf prozedural erzeugter Geometrie.
- Gebaeude, Mauern, Tore und grosse Hindernisse sind einfache modulare 3D-Grundkoerper mit stilkonformen Materialien.
- Kleine Vegetation, Schrott und Dekoration duerfen als Cutouts, Decals oder einfache 3D-Silhouetten umgesetzt werden.
- Gameplayrelevante Kollisionen bleiben vom sichtbaren Asset getrennt.

## 5. Zwei getrennte Grammatiken

### 5.1 Raeumliche Generierungsgrammatik

Die bestehende Pipeline entscheidet, welche raeumlichen Strukturen entstehen. `LandscapeRecipe`, Site-Archetypen, Korridore und Biomgrenzen beschreiben Form, Groesse, Lage, Traversierbarkeit und Anschluesse.

### 5.2 Visuelle Erfuellungsgrammatik

Das `WorldStyleKit` beschreibt, wie jede moegliche abstrakte Anforderung innerhalb einer gemeinsamen Bildsprache dargestellt wird. Es darf keine neue Geografie erfinden. Mehrere visuelle Varianten duerfen dieselbe Anforderung erfuellen, sofern sie dieselben Huellen und Anschluesse respektieren.

## 6. Semantische Demand Classes

`LandscapeFeature` wird um eine assetunabhaengige `demandClass` erweitert. Die Klasse beschreibt die fachliche Bedeutung einer Komposition, nicht ihre konkrete Datei.

Beispiele:

```text
industrial.linearBarrier
industrial.buildingShell
industrial.pipeRow
scrap.wreckCluster
scrap.scrapPile
scrap.improvisedBarrier
environment.treeStand
```

Strassen, Boden und Sites erzeugen ebenfalls Demand Classes, auch wenn sie keine `LandscapeFeature`s sind:

```text
ground.industrial
ground.scrap
transition.industrial.scrap
corridor.surface
corridor.edge
junction.degree3
junction.degree4
site.industrialYard.entrance
site.scrapYard.entrance
```

Die vorhandenen abstrakten Werte `shape`, `size`, `traversal`, `role`, `placementMode`, `footprint` und `rotation` bleiben erhalten. `demandClass` praezisiert nur, welche visuelle Familie diese bereits festgelegte Geometrie erfuellen darf.

## 7. GeneratorCapabilitySpec

Der gesamte mathematische Assetbedarf wird deklarativ beschrieben:

```ts
interface AssetDemandRule {
  id: DemandClassId;
  source: 'landscape' | 'ground' | 'transition' | 'corridor' | 'junction' | 'site';
  biomes: BiomeId[];
  shapes: LandscapeShape[];
  sizeRange: { min: Footprint; max: Footprint };
  traversal: TraversalType;
  roles: LandscapeRole[];
  placementModes: PlacementMode[];
  connectorProfile?: ConnectorProfileId;
  familyRole: AssetFamilyRole;
  requiredVariants: number;
}
```

Regeln fuer Landschaftskompositionen liegen fachlich neben den `LandscapeRecipe`s. Regeln fuer Boden, Korridore, Junctions und Sites liegen bei ihren jeweiligen Grammatiken. Ein zentraler `GeneratorCapabilitySpec` importiert und vereinigt sie. Dadurch bleibt die Verantwortung lokal, waehrend der Katalog vollstaendig kompiliert werden kann.

Die Menge ist geschlossen: Jede vom Generator emittierbare `demandClass` muss im Capability Spec stehen, und jede deklarierte Klasse muss entweder erreichbar oder ausdruecklich als reservierte Zukunftsklasse markiert sein.

## 8. RequiredAssetCatalog

`compileRequiredAssetCatalog` arbeitet ohne RNG und ohne Beispielseeds. Es normalisiert und vereinigt alle Capability-Regeln zu einem deterministischen Pflichtkatalog:

```ts
interface RequiredAssetFamily {
  demandClass: DemandClassId;
  familyRole: AssetFamilyRole;
  requiredVariants: number;
  biomes: BiomeId[];
  envelopeRange: { min: Footprint; max: Footprint };
  connectors: ConnectorProfileId[];
  requiredStates: AssetState[];
}

interface RequiredAssetCatalog {
  schemaVersion: number;
  generatorVersion: string;
  families: RequiredAssetFamily[];
  signature: string;
}
```

Sortierung und Signatur sind kanonisch. Aendert eine Generatorregel den mathematischen Bedarf, aendert sich die Katalogsignatur und die Coverage-Pruefung nennt die betroffenen Familien.

Ein CLI-Werkzeug schreibt den menschenlesbaren Katalog als JSON und Markdown-Bericht. Diese Artefakte werden aus dem TypeScript-Modell erzeugt und nicht von Hand gepflegt.

## 9. WorldStyleKit

Ein WorldStyleKit ist eine geschlossene, versionierte Erfuellung des Pflichtkatalogs:

```ts
interface WorldStyleKit {
  id: WorldStyleKitId;
  version: number;
  catalogSignature: string;
  globalStyle: GlobalStyleContract;
  biomeKits: Record<BiomeId, BiomeStyleKit>;
  families: AssetFamily[];
}
```

Der globale Stilvertrag legt mindestens fest:

- Weltmassstab und Hoehenkonvention,
- Texeldichte,
- Palette und erlaubte Biomvariationen,
- Materialantwort und Glanzbereich,
- Kontur- und Silhouettensprache,
- Beleuchtungsannahmen,
- Rost-, Schmutz- und Zerstoerungssprache,
- gemeinsame technische Texturformate.

Ein `BiomeStyleKit` erbt diesen Vertrag und darf nur deklarierte Achsen wie Palette, Materialgewicht, Vegetationsdichte oder Zerstoerungsgrad variieren. Es ersetzt nicht die globale Bildsprache.

Eine `AssetFamily` erfuellt genau eine oder mehrere kompatible Demand Classes und enthaelt Varianten mit identischen technischen Garantien:

```ts
interface AssetFamily {
  id: AssetFamilyId;
  styleKitId: WorldStyleKitId;
  fulfills: DemandClassId[];
  connectorProfile?: ConnectorProfileId;
  variants: AssetVariant[];
}
```

## 10. Anschluesse und modulare Geometrie

Gebaeude, Mauern, Tore, Site-Einfahrten und lineare Objekte besitzen typisierte Ports. Ein Port beschreibt lokale Position, Richtung, Breite, Freiraum, Hoehenprofil und erlaubte Gegenstuecke. Nur geometrisch kompatible Ports duerfen verbunden werden.

```ts
interface AssetPort {
  id: string;
  kind: 'road' | 'gate' | 'wall' | 'building' | 'pipe' | 'yard';
  position: Vec3;
  outwardAngle: number;
  width: number;
  clearance: number;
  compatibleWith: string[];
}
```

Sites legen ihre benoetigten Ports vor der Assetaufloesung fest. Das konkrete Asset muss diese Ports exakt erfuellen und darf die reservierte Einfahrt nicht einengen.

## 11. Strassen

`RoutedCorridor.centerline` und `width` bleiben die autoritative Strassengeometrie. Freie Abbiegungen werden durch das Ribbon beziehungsweise einen spaeteren parametrischen Strassenmesh erzeugt, nicht durch starre 90-Grad-Kurvenbilder.

Das Strassenkit liefert:

- nahtlos laengs wiederholbare Oberflaechenmaterialien,
- kompatible Rand- und Bankettprofile,
- Decal-Sets fuer Risse, Flickstellen und Markierungen,
- parametrische Endkappen,
- Junction-Patches fuer reale Knoten,
- Site-Zufahrtsprofile,
- Materialvariationen, die denselben Anschlussvertrag einhalten.

Junctions werden aus `RealizedTraversalGraph` abgeleitet. Die Geometrie vereinigt die ankommenden Strassenflaechen; das Assetkit liefert Material und Detailauflagen. Deshalb funktionieren beliebige Einfallswinkel.

## 12. Biom-Boden und Uebergaenge

Jedes Biom liefert ein kachelbares Grundmaterial mit identischer UV-, Skalierungs- und Kanaldefinition. Regionsgrenzen erzeugen geometrische Blendmasken. Der erste Vertikalschnitt benoetigt einen freigegebenen Uebergang `industrial <-> scrap`.

Der Uebergang ist keine separate zufaellige Dekoration. Er mischt zwei kompatible Grundmaterialien und darf zusaetzliche, zur Grenzrichtung passende Decals einsetzen. Derselbe Mechanismus muss spaeter beliebige freigegebene Biompaarungen tragen.

## 13. Assetproduktion

Die Produktion arbeitet familienweise:

```text
RequiredAssetFamily
-> FamilyGenerationBrief
-> Kandidatenverzeichnis
-> technische Validierung
-> Pruefszene und Kontaktbogen
-> Freigabe
-> registrierte AssetFamily
```

`FamilyGenerationBrief` enthaelt nicht nur einen Bildprompt, sondern alle verbindlichen technischen und stilistischen Parameter: Zweck, Silhouette, Palette, Materialprofil, Massstab, Variantenanzahl, Huellen, Ports, Ansichten, Transparenz, Texturwiederholung und verbotene Merkmale.

Prozedural exakt loesbare Assets wie kachelbare Boeden, Strassenmasken und geometrische Grundkoerper werden deterministisch erzeugt. Bildgenerierung darf Texturdetails, Cutouts, Decals und visuelle Varianten liefern, muss aber dieselben Briefs und Pruefungen durchlaufen.

## 14. Kandidaten, Freigabe und Registry

Erzeugte Dateien beginnen im Zustand `candidate`. Ein Kandidat wird nicht von der Runtime geladen. Die technische Pruefung kontrolliert mindestens:

- Abmessungen und Dateiformat,
- Alpha- und Randverhalten,
- Nahtlosigkeit bei kachelbaren Texturen,
- Texeldichte,
- Assethuelle gegen Featurehuelle,
- Portpositionen und Portbreiten,
- erlaubte Rotationen,
- Stilkit- und Familienzuordnung,
- Vollstaendigkeit aller Pflichtvarianten.

Danach erzeugt das Werkzeug Kontaktboegen und standardisierte Pruefszenen: Familie allein, Familie mit Nachbarfamilien, Biomuebergang, Strassenanschluss und mehrere vollstaendige Seeds. Erst eine freigegebene Familie wird in die unveraenderliche Runtime-Registry aufgenommen.

Die Freigabe wird als Metadatum mit Kitversion, Katalogsignatur und Dateihashes gespeichert. Nachtraeglich veraenderte Dateien verlieren dadurch automatisch ihre Freigabe.

## 15. Runtime-Aufloesung

Die Runtime waehlt zuerst genau ein vollstaendig gecovertes `WorldStyleKit`. `resolveWorldAssets` arbeitet anschliessend mit dem getrennten RNG-Strom `visuals`:

```text
demandClass
+ Biome
+ Featurehuelle
+ Ports
+ erlaubte Rotation
+ WorldStyleKit
-> kompatible Familie
-> kompatible Variante
```

Die Auswahl ist deterministisch. Eine neue Variante darf bei unveraendertem Kit nicht stillschweigend bestehende Seeds umsortieren; Kitversion und Familienversion sind Teil des visuellen Reproduktionsvertrags.

Eine fehlende Familie, unpassende Huellen oder inkompatible Ports erzeugen eine diagnostische Ausnahme. Es gibt keinen generischen Primitive-, Cross-Kit- oder Naechstbesten-Fallback in der freigegebenen Runtimeprojektion.

Die bestehende Grayboxprojektion bleibt ausschliesslich ein explizites Entwicklungsinstrument zur Pruefung abstrakter Geografie. Sie wird nicht als Laufzeitfallback des Assetresolvers aufgerufen.

## 16. Erster Industrie-Schrott-Vertikalschnitt

Das erste Kit erhaelt eine einzige globale Bildsprache und mindestens folgende Familien:

### Gemeinsam

- Strassenoberflaeche, Strassenrand und Schadensdecals,
- allgemeine kleine Schmutz- und Truemmerdecals,
- gemeinsame technische Materialpalette,
- standardisierte Site-Zufahrt.

### Industrie

- kachelbarer Industrieboden,
- modulare Hallenhuelle,
- Fabrikmauer mit Torport,
- Rohr- oder Containerreihe,
- Industriehof-Site,
- zwei kleine Fuell-/Deckungsfamilien.

### Schrott

- kachelbarer Schrottboden,
- Wrackcluster,
- Schrotthaufenfamilie,
- improvisierte Barriere,
- Schrottplatz-Site,
- zwei kleine Fuell-/Deckungsfamilien.

### Uebergang

- industrielle zu schrottige Bodenblendung,
- passende Grenzdecals,
- Strassenranddarstellung in beiden Biomen ohne sichtbaren Bruch.

Dieser Vertikalschnitt prueft den vollstaendigen Vertrag. Er behauptet noch nicht, die uebrigen vier Biome visuell fertigzustellen. Ein unvollstaendiges Kit wird nicht als allgemeines Runtimekit aktiviert; es darf nur in seiner expliziten Asset-Pruefszene und in dafuer gedeckten Testwelten verwendet werden.

## 17. Seed-Korpus und Coverage

Seedtests sind nicht die Quelle des Katalogs. Sie beantworten andere Fragen:

- Wird jede nicht reservierte Demand Class tatsaechlich erreicht?
- Wie oft tritt jede Familie und Variante auf?
- Entstehen problematische Wiederholungen?
- Werden Ports und Uebergaenge in realistischen Kombinationen verwendet?
- Sind deklarierte Klassen tot oder praktisch unerreichbar?
- Wirken mehrere vollstaendige Karten trotz gemeinsamer Bildsprache unterschiedlich?

Der Bericht unterscheidet harte Katalog-Coverage von empirischer Seed-Coverage. Eine mathematisch notwendige, aber in 500 Seeds nicht beobachtete Klasse bleibt trotzdem Pflicht, bis die Generatorgrammatik sie entfernt.

## 18. Fehlerbehandlung

Fehler sind laut und enthalten mindestens Stilkit, Katalogsignatur, Demand Class, Familie, Variante und konkreten Regelverstoss.

Harte Fehler:

- Generator emittiert unbekannte Demand Class,
- Capability Spec besitzt widerspruechliche Regeln,
- Kit deckt eine Pflichtfamilie nicht,
- Variante verletzt Huellen oder Ports,
- freigegebene Datei besitzt einen falschen Hash,
- Runtime versucht ein unvollstaendiges Kit zu aktivieren.

Warnungen im Produktionsbericht:

- geringe Variantenzahl,
- starke Wiederholung im Seed-Korpus,
- selten oder nie beobachtete Demand Class,
- auffaellige Farb- oder Helligkeitsabweichung innerhalb einer Familie.

Warnungen werden nicht in stille Runtime-Ersatzentscheidungen umgewandelt.

## 19. Module und Datenfluss

Neue fachliche Module:

- `generatorCapabilitySpec.ts`: vereinigt alle mathematisch moeglichen Anforderungen.
- `assetDemandTypes.ts`: Demand Classes, Familien, Ports und Stilkit-Typen.
- `assetDemandCompiler.ts`: erzeugt den kanonischen Pflichtkatalog.
- `worldStyleKit.ts`: registriert und validiert komplette Kits.
- `assetCoverage.ts`: harte Katalog- und empirische Seed-Coverage.
- `worldAssetResolver.ts`: deterministische Aufloesung innerhalb eines Kits.
- `assetCandidateManifest.ts`: Kandidaten-, Freigabe- und Hashmetadaten.
- `assetPreviewData.ts`: standardisierte Pruefszenen und Kontaktbogen-Daten.

Werkzeuge:

- Katalogbericht erzeugen,
- erste prozedurale Texturfamilie erzeugen,
- technische Assetpruefung ausfuehren,
- Kontaktbogen beziehungsweise Pruefszenen erzeugen.

Die bestehenden Module `worldGenerator`, `pathRouter`, `realizedTraversalGraph` und `spatialReservations` bleiben fuer Geografie autoritativ. `assetKit` und `grayboxResolver` werden schrittweise in den neuen Vertrag ueberfuehrt; sie bleiben nicht als versteckte Runtime-Ausweichlogik bestehen.

## 20. Tests und Abnahme

Automatische Tests:

- gleiche Capability Spec erzeugt bytegleich denselben Katalog,
- jede emittierbare Demand Class steht im Capability Spec,
- jede nicht reservierte Capability-Regel ist durch Generatorlogik erreichbar,
- ein vollstaendiges Kit deckt jede Pflichtfamilie und jeden Pflichtzustand,
- unvollstaendige oder Cross-Kit-Familien werden abgelehnt,
- Huellen- und Portverletzungen werden abgelehnt,
- freie Strassenkurven und Junctions benoetigen keine winkelfesten Kurvenassets,
- Industrie-Schrott-Bodenuebergang besitzt kompatible Materialkanaele,
- visueller RNG veraendert keine Geografie,
- Seed-Coverage ueber mindestens 500 Seeds erzeugt einen stabilen Bericht,
- Dateihashes invalidieren veraenderte freigegebene Kandidaten,
- vollstaendiger Projekt-Testlauf und Produktionsbuild bestehen.

Visuelle Abnahme des Vertikalschnitts:

- Industrie und Schrott sind unterscheidbar, wirken aber wie dieselbe Welt,
- Bodenuebergaenge besitzen keine harten, unmotivierten Naehte,
- Strassen biegen frei ab und verbinden Junctions sowie Site-Ports ohne Luecken,
- Gebaeude und Hindernisse respektieren Fahrwege und Freiraeume,
- keine Assetfamilie wirkt durch Massstab, Perspektive, Palette oder Detailgrad fremd,
- mehrere Seeds wiederholen nicht offensichtlich dieselbe Einzelkomposition.

## 21. Nicht Teil dieses Vertikalschnitts

- finale Assetfamilien fuer Mud, Ruins, Crater und Wasteland,
- vollstaendige Site-Archetype-Bibliothek,
- animierte Vegetation,
- Zerstoerungsphysik fuer Gebaeudemodule,
- automatische kuenstlerische Freigabe ohne visuelle Pruefszene,
- Runtime-Erzeugung neuer Bildassets waehrend eines Runs.

## 22. Ergebnis

Der Generator kennt seinen Bedarf nicht durch Beobachtung einzelner Seeds, sondern durch seine explizite, geschlossene Grammatik. Der daraus kompilierte Pflichtkatalog wird von genau einem globalen WorldStyleKit erfuellt. Industrie, Schrott, Strassen, Sites und Uebergaenge werden als zusammengehoerige Familien produziert, technisch validiert und visuell freigegeben. Die Assetseite kann sich danach erweitern, ohne die Geografie neu zu definieren oder inkompatible Einzelobjekte zufaellig zu vermischen.
