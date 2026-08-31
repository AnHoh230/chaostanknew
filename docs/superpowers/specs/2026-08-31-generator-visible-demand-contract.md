# Generator-zu-Asset-Sichtbarkeitsvertrag

## Ziel

Das AssetLab muss die vollständige semantische Ausgabe des Weltgenerators darstellen. Der Generator entscheidet, **was** an welcher Stelle der Welt existiert. Das Asset-System entscheidet ausschließlich, **wie** diese bereits erzeugte Anforderung dargestellt wird.

Für jede vom Generator erzeugte Asset-Anforderung gilt verbindlich:

```text
GeneratorOccurrence
  -> genau ein WorldAssetPlacement
  -> entweder freigegebenes Asset
  -> oder sichtbarer Diagnose-Marker "Asset fehlt"
```

Es gibt keine stillen Auslassungen, keinen Ersatzgenerator und keine erfundene Ersatz-Assetfamilie.

## Verantwortungsgrenzen

### Generator

Der Generator besitzt:

- Position, Rotation und Footprint einer Anforderung,
- semantische Demand-Klasse,
- Biom- und Feldbezug,
- Traversierungs- und Kollisionsbedeutung,
- Site-, Korridor- und Clearing-Struktur.

Neue echte Assets dürfen diese Entscheidungen nicht verändern. Ein fehlender Marker und sein späteres Asset müssen dieselbe Generator-Occurrence darstellen.

### Asset-Katalog und Style-Kit

Der Katalog beschreibt, welche Darstellung eine Demand-Klasse benötigt. Ein Style-Kit kann eine passende freigegebene Familie liefern. Es darf keine Generator-Anforderung erzeugen oder entfernen.

### AssetLab

Das Lab ist eine vollständige Weltansicht, keine Auswahl hübscher Beispiele. Es zeigt:

- alle Generator-Occurrences,
- freigegebene Assets, wo eine passende Familie existiert,
- deutlich magentafarbene Diagnosekörper, wo eine Familie fehlt,
- Anzahl und Klassen aller fehlenden Darstellungen.

Ein Diagnosekörper ist kein visueller Fallback. Er ist ein absichtlich hässliches Prüfmittel und darf nie als Laufzeit-Asset gelten.

## Datenvertrag

`WorldAssetPlacement.asset` ist eine diskriminierte Union:

```ts
type PlacementStyleAsset =
  | {
      status: 'resolved';
      familyId: string;
      variantId: string;
      files: AssetFileRef[];
      footprint: Footprint;
    }
  | {
      status: 'missing';
      demandClass: DemandClassId;
      reason: 'outside-preview-scope' | 'no-compatible-family';
      footprint: Footprint;
      familyRole: AssetFamilyRole;
      geometryMode: AssetGeometryMode;
    };
```

Der Placement-Plan enthält keine `omitted`-Liste mehr. Seine Vollständigkeit ist testbar:

```text
Anzahl Demand-Occurrences == Anzahl Placements
jede Demand-ID kommt genau einmal vor
```

## Vollständige Site-Demands

Jede erzeugte Site bekommt genau eine biomabhängige Site-Demand-Klasse:

| Biom | Site-Demand |
|---|---|
| wasteland | `site.wastelandOutpost` |
| scrap | `site.scrapYard` |
| industrial | `site.industrialYard` |
| mud | `site.mudBasin` |
| ruins | `site.ruinsComplex` |
| crater | `site.craterStation` |

Der bestehende Entrance-Demand bleibt davon unabhängig. Eine Site kann deshalb eine Site-Darstellung und mehrere Eingangs-Darstellungen besitzen.

## Feldabgeleitete Umwelt-Demands

Die vorhandenen WorldFields müssen zusätzlich selbst Umweltobjekte erzeugen. Diese Stufe liegt im Generator, nicht im Asset-Placement.

Erste verbindliche Grammatik:

- `environment.dryBrush`: trockene, offene Felder; destructible/driveable,
- `environment.wetBrush`: feuchte Felder; destructible/driveable,
- `environment.rockOutcrop`: stark zerstörte, passende Felder; blocking.

Die Kandidaten entstehen deterministisch aus den Rasterwerten. Mindestabstand, Weltgrenzen und harte Reservierungen von Sites, Korridoren, Clearings und Spawn werden respektiert. Die Dichte wird von `WorldDNA.structuralDensity` skaliert.

Diese Demands werden als echte `LandscapeFeature`-Occurrences in die generierte Welt geschrieben. Damit sind sie Bestandteil von Validierung, deterministischem Signaturtest, Gameplay-Bedeutung und Asset-Ableitung.

## Nicht Bestandteil dieses Moduls

- Höhenlagen und Berge als echtes Traversierungs- und Kollisionssystem,
- finale Art-Produktion für die neuen Klassen,
- ein zweiter oder alter Generatorpfad,
- automatische Ersetzung fehlender Familien durch thematisch ähnliche Familien.

Höhenlagen brauchen später ein eigenes Generator-Modul. Ein Berg darf nicht nur als Bild auf ansonsten flachem, befahrbarem Boden erscheinen.

## Abnahmekriterien

1. Für mehrere Seeds entspricht jede Demand-Occurrence genau einem sichtbaren Placement.
2. Eine nicht abgedeckte Demand-Klasse erscheint als magentafarbener Marker und in der Missing-Statistik.
3. Jede Site erzeugt unabhängig vom Biom eine Site-Demand.
4. WorldFields erzeugen deterministisch trockene Büsche, feuchte Büsche und Felsaufschlüsse, sofern die jeweiligen Feldbedingungen existieren.
5. Echte Familien ersetzen nur die Darstellung; Position, Anzahl und Footprint bleiben identisch.
6. Bestehende freigegebene Straßen-, Boden-, Industrie- und Schrott-Assets bleiben echte Assetdarstellungen.
7. Der vollständige Testlauf, Asset-Katalogprüfung und ein visueller Browsertest des Labs sind grün.
