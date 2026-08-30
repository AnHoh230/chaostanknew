# Required Asset Catalog

- Generator version: `hybrid-asset-grammar-v1`
- Catalog signature: `f8386129`
- Required families: **32**

| Demand class | Source | Geometry | Biomes | Variants | States | Connectors | Reserved |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| `corridor.edge` | corridor | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | corridor-width-v1 | no |
| `corridor.surface` | corridor | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | corridor-width-v1 | no |
| `crater.boundaryArc` | landscape | bounded | crater | 3 | intact |  | no |
| `crater.clearingIsland` | landscape | bounded | crater | 2 | intact |  | no |
| `crater.destructibleBlob` | landscape | bounded | crater | 3 | damaged, destroyed, intact |  | no |
| `ground.crater` | ground | tileable | crater | 1 | intact | ground-material-v1 | no |
| `ground.industrial` | ground | tileable | industrial | 1 | intact | ground-material-v1 | no |
| `ground.mud` | ground | tileable | mud | 1 | intact | ground-material-v1 | no |
| `ground.ruins` | ground | tileable | ruins | 1 | intact | ground-material-v1 | no |
| `ground.scrap` | ground | tileable | scrap | 1 | intact | ground-material-v1 | no |
| `ground.transition` | transition | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | biome-boundary-v1 | no |
| `ground.wasteland` | ground | tileable | wasteland | 1 | intact | ground-material-v1 | no |
| `industrial.breakableEdge` | landscape | bounded | industrial | 3 | damaged, destroyed, intact |  | no |
| `industrial.coverCluster` | landscape | bounded | industrial | 3 | intact |  | no |
| `industrial.linearBarrier` | landscape | bounded | industrial | 2 | intact |  | no |
| `junction.degree3` | junction | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | road-junction-v1 | no |
| `junction.degree4` | junction | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | road-junction-v1 | no |
| `mud.clearingIsland` | landscape | bounded | mud | 2 | intact |  | no |
| `mud.destructibleBlob` | landscape | bounded | mud | 3 | damaged, destroyed, intact |  | no |
| `mud.fillerCluster` | landscape | bounded | mud | 3 | intact |  | no |
| `ruins.coverCluster` | landscape | bounded | ruins | 3 | damaged, destroyed, intact |  | no |
| `ruins.landmarkArc` | landscape | bounded | ruins | 2 | intact |  | no |
| `ruins.linearBarrier` | landscape | bounded | ruins | 3 | intact |  | no |
| `scrap.landmarkIsland` | landscape | bounded | scrap | 2 | intact |  | no |
| `scrap.scrapPile` | landscape | bounded | scrap | 3 | damaged, destroyed, intact |  | no |
| `scrap.wreckCluster` | landscape | bounded | scrap | 3 | intact |  | no |
| `site.entrance` | site | parametric | crater, industrial, mud, ruins, scrap, wasteland | 1 | intact | yard-road-v1 | no |
| `site.industrialYard` | site | bounded | industrial | 2 | intact | yard-road-v1 | yes |
| `site.scrapYard` | site | bounded | scrap | 2 | intact | yard-road-v1 | yes |
| `wasteland.coverCluster` | landscape | bounded | wasteland | 3 | damaged, destroyed, intact |  | no |
| `wasteland.destructibleBlob` | landscape | bounded | wasteland | 3 | damaged, destroyed, intact |  | no |
| `wasteland.landmarkIsland` | landscape | bounded | wasteland | 2 | intact |  | no |
