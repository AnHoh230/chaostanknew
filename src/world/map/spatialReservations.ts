import { cellCenter } from './worldGrid';
import type {
  GridSpec,
  RealizedTraversalGraph,
  RoutedCorridor,
  Site,
  SpatialReservation,
} from './worldTypes';

function discCells(grid: GridSpec, center: { x: number; z: number }, radius: number): number[] {
  const result: number[] = [];
  const cellPadding = grid.cellSize * Math.SQRT2 / 2;
  for (let cell = 0; cell < grid.cols * grid.rows; cell++) {
    const point = cellCenter(grid, cell);
    if (Math.hypot(point.x - center.x, point.z - center.z) <= radius + cellPadding) result.push(cell);
  }
  return result;
}

function sweptCells(grid: GridSpec, centerCells: readonly number[], radius: number): number[] {
  const selected = new Set<number>();
  const reach = Math.ceil((radius + grid.cellSize * Math.SQRT2 / 2) / grid.cellSize);
  for (const centerCell of centerCells) {
    const centerCol = centerCell % grid.cols;
    const centerRow = Math.floor(centerCell / grid.cols);
    const center = cellCenter(grid, centerCell);
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const col = centerCol + dx, row = centerRow + dz;
        if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
        const cell = row * grid.cols + col;
        const point = cellCenter(grid, cell);
        if (Math.hypot(point.x - center.x, point.z - center.z) <= radius + grid.cellSize * Math.SQRT2 / 2) {
          selected.add(cell);
        }
      }
    }
  }
  return [...selected].sort((a, b) => a - b);
}

export function generateSpatialReservations(
  sites: readonly Site[],
  corridors: readonly RoutedCorridor[],
  realized: RealizedTraversalGraph,
  grid: GridSpec,
): SpatialReservation[] {
  const reservations: SpatialReservation[] = [];
  const spawn = sites.find((site) => site.id === 'spawn') ?? sites[0];
  if (!spawn) throw new Error('cannot-reserve-world-without-sites');

  reservations.push({
    id: `reservation_spawn_${spawn.id}`,
    type: 'spawn',
    cells: discCells(grid, spawn.center, spawn.radius + 16),
    clearance: 16,
    allowedRoles: [],
  });
  for (const site of sites) {
    reservations.push({
      id: `reservation_site_${site.id}`,
      type: 'site',
      cells: discCells(grid, site.center, site.radius),
      clearance: 6,
      allowedRoles: ['landmark', 'clearing-anchor'],
    });
    if (site.id !== spawn.id) {
      reservations.push({
        id: `reservation_clearing_${site.id}`,
        type: 'clearing',
        cells: discCells(grid, site.center, Math.max(grid.cellSize, site.radius * 0.65)),
        clearance: Math.max(4, site.accessBand * 0.5),
        allowedRoles: ['clearing-anchor'],
      });
    }
  }
  for (const corridor of corridors) {
    reservations.push({
      id: `reservation_corridor_${corridor.id}`,
      type: 'corridor',
      cells: sweptCells(grid, corridor.cells, corridor.width / 2),
      clearance: 3,
      allowedRoles: ['border'],
    });
  }
  const widestCorridor = Math.max(grid.cellSize * 2, ...corridors.map((corridor) => corridor.width));
  for (const node of realized.nodes.filter((entry) => entry.kind === 'junction')) {
    reservations.push({
      id: `reservation_junction_${node.id}`,
      type: 'junction',
      cells: discCells(grid, node.pos, widestCorridor * 0.75),
      clearance: widestCorridor * 0.75,
      allowedRoles: ['border', 'landmark'],
    });
  }
  return reservations;
}
