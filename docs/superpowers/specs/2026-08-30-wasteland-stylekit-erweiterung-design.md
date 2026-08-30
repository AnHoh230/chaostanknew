# Wasteland-Erweiterung für `ironwaste-v1`

## Ziel

Der bestehende Industrial-Scrap-Vertikalschnitt wird um das vom Hybridgenerator mathematisch verlangte Biom `wasteland` erweitert. Der Generator bleibt die einzige Quelle des Assetbedarfs. Es entstehen keine zusätzlichen Sites, Objektklassen oder Platzierungsregeln, die nicht aus `GENERATOR_CAPABILITY_SPEC` beziehungsweise der fertigen `GenerierteWelt` folgen.

## Generatorbedarf

| Demand Class | Visuelle Familie | Varianten/Zustände |
| --- | --- | --- |
| `ground.wasteland` | nahtloser trockener, graubrauner Boden | 1 × intact |
| `wasteland.landmarkIsland` | erodierte Insel mit gebrochenem Funkmast | 2 × intact |
| `wasteland.destructibleBlob` | spröder Trümmer- und Blechhaufen | 3 × intact/damaged/destroyed |
| `wasteland.coverCluster` | niedrige Sandsack-, Stein- und Blechdeckung | 3 × intact/damaged/destroyed |
| `ground.transition` | Industrial↔Wasteland und Scrap↔Wasteland | je 1 parametrischer Übergang |

Die globale Straße und `site.entrance` werden für Wasteland wiederverwendet, weil ihre Geometrie bereits parametrisch aus Korridor und Site-Port entsteht. Eine Wasteland-Site wird nicht erfunden: Der aktuelle Pflichtkatalog verlangt keine.

## Bildsprache

Wasteland erweitert die gemeinsame matte, verwitterte Ironwaste-Sprache um `ash`, `dryClay` und `bone`. Rost, Stahl, Graphit und der sparsame Cyan-Akzent bleiben kitweit identisch. Die Stilreferenz liegt unter `docs/superpowers/assets/wasteland-v1-concept.png`; Runtime-Dateien werden weiterhin deterministisch und technisch prüfbar erzeugt.

## Technische Regeln

- Der Boden ist in X und Y nahtlos und verwendet dieselbe Texeldichte wie Industrial und Scrap.
- Übergangstexturen sind entlang der Biomgrenze nahtlos und werden durch die gerichtete Transition-Geometrie auf reale Zellgrenzen gelegt.
- Alle drei 2.5D-Rezepte bleiben auch in der kleinsten vom Generator erlaubten Hülle.
- Wasteland-Decals besitzen vollständig transparente Außenränder.
- Die Kitversion steigt auf `2`; das genehmigte Manifest enthält Hashes aller 14 Kandidatendateien.
- Anforderungen zu noch unsichtbaren Biomen werden im AssetLab weiterhin ausdrücklich ausgelassen. Es existiert kein Graybox- oder Fremdkit-Fallback.

## Abnahme

- `validateWorldStyleKit` deckt alle Wasteland-Demand-Classes und Zustände.
- Beide neuen Biompaarungen werden ohne Ersatzfamilie aufgelöst.
- Reale Generator-Seeds enthalten Wasteland-Boden, Wasteland-Landschaft und gerichtete Übergänge.
- Ein anderer `visualSeed` verändert Varianten, nicht Geografie oder Platzierungsmenge.
- Kandidatenprüfung, AssetLab-Browserprüfung, vollständige Testsuite und Produktionsbuild bestehen.
