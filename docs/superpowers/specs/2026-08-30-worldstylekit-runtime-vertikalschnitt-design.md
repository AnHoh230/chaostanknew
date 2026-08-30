# WorldStyleKit-Runtime-Vertikalschnitt

## Ziel

Der erste genehmigte Asset-Schnitt `ironwaste-v1` wird auf echten, unveränderten Hybridgenerator-Welten sichtbar. Der Generator bleibt die einzige Autorität für Biome, Korridore, Sites, Reservations und Landscape-Features. Das StyleKit liefert ausschließlich die visuelle Realisierung dieser bereits feststehenden Geometrie.

Der Schnitt ist eine Entwicklungsansicht und noch keine Aktivierung im normalen Spiel. Er zeigt Industrial, Scrap, deren gemeinsame Übergänge, die globale Straße und die zugehörigen Landscape- und Site-Familien. Nicht unterstützte Klassen werden in dieser Ansicht ausdrücklich ausgelassen und niemals durch Graybox-Assets oder fremde Kit-Familien ersetzt.

## Verbindlicher Datenfluss

```text
GenerierteWelt
  + WorldStyleKit
  + approved CandidateManifest
  + visualSeed
→ WorldAssetPlacementPlan
→ WorldStylePreviewRenderer
→ sichtbare Babylon-Szene
```

Die abstrakte Welt wird vor und nach der Planerzeugung bytegleich geprüft. Kollisions-, Fahrraum- und Erreichbarkeitslogik werden nicht aus Assetdateien abgeleitet.

## Preview- und Runtime-Vertrag

`WorldStyleKit` erhält für Preview-Kits einen expliziten `previewBiomes`-Scope. Eine Demand-Vorkommnis darf im Preview nur aufgelöst werden, wenn:

- seine Klasse in `previewScope` liegt,
- alle explizit genannten Biome in `previewBiomes` liegen,
- eine Family aus genau diesem Kit Connectoren, Footprint und Biomkombination erfüllt,
- das Candidate-Manifest `approved` ist und Kit-ID, Kit-Version und Katalogsignatur übereinstimmen.

Biome-lose globale Anforderungen wie die gemeinsame Straße bleiben zulässig. Eine nicht erfüllte Anforderung innerhalb des ausgewählten Preview-Scopes ist ein Fehler. Anforderungen außerhalb des Scopes werden mit Grund gezählt und ausgelassen; es gibt keine Ersatzwahl.

Ein Kit mit `activation: runtime` muss weiterhin den vollständigen nicht reservierten Pflichtkatalog abdecken. Erst dann darf der normale Spielrenderer es verwenden.

## PlacementPlan

Der reine Compiler `buildWorldAssetPlacementPlan` erzeugt deterministische, serialisierbare Platzierungen:

- Ground-Platzierungen enthalten Biom, Raster und alle zugehörigen Zellen.
- Transition-Platzierungen enthalten die konkrete gemeinsame Zellkante, Richtung und beide Biome.
- Corridor-Platzierungen enthalten die Generator-Centerline und die autoritative Breite; Surface und Edge werden getrennt aufgelöst.
- Junction-Platzierungen enthalten Position und Grad.
- Landscape-Platzierungen übernehmen Position, Rotation, Footprint, Traversal und Rolle des Features.
- Site-Platzierungen übernehmen Zentrum, Radius und Biom.
- Site-Entrances entstehen pro Korridorende, nicht nur einmal pro Site. Ihre Position und Blickrichtung werden aus dem jeweiligen Endstück der Centerline abgeleitet.

Jede Platzierung referenziert die exakt gewählte Family und Variante. Die Auswahl hängt nur von `visualSeed`, Kit-Version und stabiler Demand-ID ab. Ein Wechsel des Visual-Seeds darf keine Weltgeometrie verändern.

## Visuelle Realisierung

Die Entwicklungsansicht liegt in `asset-lab.html` und verwendet denselben `generiereWelt`-Aufruf wie das Spiel. Sie hat keinen zweiten Generator und lädt keinen Graybox-Resolver.

- Biomflächen werden aus den Generatorzellen als texturierte Meshes erzeugt.
- Biomübergänge werden als gerichtete Bänder auf den realen Zellgrenzen erzeugt.
- Straßen bestehen aus einem breiteren Edge-Ribbon und einem darüberliegenden Surface-Ribbon. Gemittelte, begrenzte Miter-Normalen halten Kurven geschlossen; überlappende Endkappen schließen Korridoranschlüsse.
- Landscape- und Site-Varianten verwenden kleine, datengetriebene 2.5D-Geometrierezepte. Jedes Rezept bleibt innerhalb des autoritativen Footprints.
- Texturen werden aus den genehmigten Variant-Dateien geladen. Palette, Materialfinish und Beleuchtung stammen aus dem globalen Kit-Vertrag.

Die Ansicht bietet Seed-Wechsel und Visual-Seed-Wechsel. Eine sichtbare Scope-Anzeige nennt gerenderte und bewusst ausgelassene Anforderungen, damit Teilabdeckung niemals wie Runtime-Vollständigkeit aussieht.

## Fehlerverhalten

Es gibt keine Fallback-Assets. Die Planerzeugung bricht mit stabilen Fehlercodes ab bei:

- nicht genehmigtem oder inkompatiblem Manifest,
- unbekannten oder doppelten Demand-IDs,
- fehlender kompatibler Family innerhalb des aktiven Scopes,
- nicht unterstütztem Geometrierezept,
- Primitive-Geometrie außerhalb ihres Footprints.

Die AssetLab-Oberfläche zeigt den Fehlertext, statt still auf Graybox umzuschalten oder einen anderen Seed zu würfeln.

## Tests und Abnahme

- Reine Tests beweisen deterministische PlacementPlans und unveränderte Generatorwelten.
- Contract-Tests beweisen den Biom-Scope, genehmigte Manifeste und das Fehlen von Fallbacks.
- Geometrietests prüfen alle 2.5D-Rezepte gegen ihre Footprint-Hüllen.
- Road-Tests prüfen endliche Vertices, geschlossene Streifenbreite, Kurven und Endkappen.
- Babylon-NullEngine-Tests prüfen Erzeugung und Dispose des Renderers.
- Produktionsbuild enthält `asset-lab.html` als eigenen Einstieg.
- Mindestens zwanzig Seeds lassen sich im AssetLab wechseln, ohne dass Straßenenden auseinanderbrechen oder unterstützte Assets harte Fahrraum-Reservations verletzen.

## Nicht Bestandteil dieses Schnitts

- keine Aktivierung von `ironwaste-v1` im normalen Spiel,
- keine Herstellung der fehlenden Wasteland-, Mud-, Ruins- und Crater-Familien,
- keine Änderung an Kampf, Gegnern, Loot oder Progression,
- keine aus Bildpixeln abgeleitete Kollision,
- kein Legacy- oder Graybox-Fallback im AssetLab.
