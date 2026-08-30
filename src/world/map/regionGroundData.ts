import type { RuntimeKarte } from './runtimeMap';
import type { BiomeId } from './worldTypes';

export interface RegionMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  cellCount: number;
}

const BIOMES: BiomeId[] = ['wasteland', 'scrap', 'industrial', 'mud', 'ruins', 'crater'];

function emptyMeshData(): RegionMeshData {
  return { positions: [], normals: [], uvs: [], indices: [], cellCount: 0 };
}

export function buildRegionGroundData(runtime: RuntimeKarte): Record<BiomeId, RegionMeshData> {
  const result = Object.fromEntries(BIOMES.map((biome) => [biome, emptyMeshData()])) as Record<BiomeId, RegionMeshData>;
  const grid = runtime.regionGrid;
  for (const regionCell of runtime.regionCells) {
    const data = result[regionCell.biomeId];
    const col = regionCell.cell % grid.cols;
    const row = Math.floor(regionCell.cell / grid.cols);
    const x0 = -grid.extents.halfX + col * grid.cellSize;
    const z0 = -grid.extents.halfZ + row * grid.cellSize;
    const x1 = x0 + grid.cellSize;
    const z1 = z0 + grid.cellSize;
    const base = data.positions.length / 3;
    data.positions.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1);
    data.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    data.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    data.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    data.cellCount++;
  }
  return result;
}
