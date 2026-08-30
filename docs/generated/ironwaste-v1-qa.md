# Ironwaste v1 Asset QA

- Catalog signature: `f8386129`
- Kit version: `2`
- State: `approved`
- Activation: `preview`
- Preview biomes: `industrial`, `scrap`, `wasteland`
- Seed coverage: `1..500`
- Seed coverage signature: `95f2a916`
- Wasteland style reference: `docs/superpowers/assets/wasteland-v1-concept.png`

| File | X-edge RMS | Y-edge RMS | Alpha range | Border alpha | SHA-256 |
| --- | ---: | ---: | --- | ---: | --- |
| decal_industrial_cracks.png | 0 | 0 | 0–190 | 190 | `2f4beb98490f776a19a7f95c1fad4d7ee076f90e77bde65e0c47fda807e15407` |
| decal_scrap_fragments.png | 0 | 0 | 0–210 | 210 | `4ed07b2924ccef0b54a46ca7a44616cf065d460dbd25c3ce87a05ad10abf8578` |
| decal_shared_grime.png | 0 | 0 | 0–136 | 126 | `83557795e26dc09e0cb5f0c43be7e277d2c8ccdd0263c62d60d3ac23120fc9bf` |
| decal_wasteland_cover.png | 0 | 0 | 0–225 | 0 | `ea2e7489eeec9002705d845e84c3cc4e5a42456c38c15b9fab0401a4e4cf2f79` |
| decal_wasteland_debris.png | 0 | 0 | 0–167 | 0 | `e1b25e10e348f04c20c5df253f53363a1ee0670463feddcb6b86e91f53b322e9` |
| decal_wasteland_landmark.png | 0 | 0 | 0–205 | 0 | `2950b2de3361e8577c1103a1bc5708c35c973a20ddd9f91e51984581399dd108` |
| ground_industrial.png | 0 | 0 | 255–255 | 255 | `ade3f7fad7959c0aad914ed587ad0156f5dbea40323aaa27a2c9af45e752002a` |
| ground_scrap.png | 0 | 0 | 255–255 | 255 | `045a171ffdce4d766a3ba44943226ced2bbdf472ce6276ce23da140f923e5a08` |
| ground_wasteland.png | 0 | 0 | 255–255 | 255 | `f698110d93fff2ec7e248f1e63cc432ff534274d6ad3d6b0dd63d999d0aabef0` |
| road_edge.png | 0 | 0 | 0–220 | 220 | `330690c78f0ff2843e55a51b9eea6ce42c68bd09f9c59523eb7205f3d78ede7c` |
| road_surface.png | 0 | 0 | 255–255 | 255 | `9c99dc4d4855ed3c42373776ab1fd52e938167ed39610aecb9c132a897ed11f7` |
| transition_industrial_scrap.png | 26.751 | 0 | 0–235 | 235 | `f173bf16afdd2c0dfb4678d40fc70213aadfc02b48f0a9e1f21e28e66db9c0fc` |
| transition_industrial_wasteland.png | 14.862 | 0 | 0–235 | 235 | `77c3c1b740f8535884da37d48a61568c343747911a7851a7c92b6dda95cba893` |
| transition_scrap_wasteland.png | 16.98 | 0 | 0–235 | 235 | `fe8f6b196830495965586d918d8bf8c8f37142cc11c5f43722e3d419af49d379` |

## Generator demand frequencies

| Demand class | Occurrences in 500 seeds |
| --- | ---: |
| `corridor.edge` | 5005 |
| `corridor.surface` | 5005 |
| `crater.boundaryArc` | 2748 |
| `crater.clearingIsland` | 1676 |
| `crater.destructibleBlob` | 1870 |
| `ground.crater` | 293 |
| `ground.industrial` | 288 |
| `ground.mud` | 306 |
| `ground.ruins` | 325 |
| `ground.scrap` | 343 |
| `ground.transition` | 293360 |
| `ground.wasteland` | 500 |
| `industrial.breakableEdge` | 2082 |
| `industrial.coverCluster` | 2763 |
| `industrial.linearBarrier` | 1527 |
| `junction.degree3` | 837 |
| `junction.degree4` | 18 |
| `mud.clearingIsland` | 2616 |
| `mud.destructibleBlob` | 1240 |
| `mud.fillerCluster` | 4023 |
| `ruins.coverCluster` | 1710 |
| `ruins.landmarkArc` | 939 |
| `ruins.linearBarrier` | 1716 |
| `scrap.landmarkIsland` | 880 |
| `scrap.scrapPile` | 1218 |
| `scrap.wreckCluster` | 918 |
| `site.entrance` | 10010 |
| `site.industrialYard` | 517 |
| `site.scrapYard` | 261 |
| `wasteland.coverCluster` | 10614 |
| `wasteland.destructibleBlob` | 6880 |
| `wasteland.landmarkIsland` | 10688 |

- Missing catalog classes: **0**
- Unknown emitted classes: **0**

Unrestricted runtime activation remains blocked until the complete non-reserved catalog is covered.
