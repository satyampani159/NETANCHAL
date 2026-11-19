// Grid pathfinding for bots. The map has big obstacles (India Gate, autos,
// barricades), so a short "probe ahead" is not enough to get around them.
import type { MapDef } from '../map';
import { type SimWorld, blocked } from './state';

const CELL = 40;
/** clearance used for the grid: a bit more than the biggest character radius */
const CLEARANCE = 30;

interface Grid {
  cols: number;
  rows: number;
  walls: Uint8Array;
}

const cache = new WeakMap<MapDef, Grid>();

function gridFor(world: SimWorld): Grid {
  let g = cache.get(world.map);
  if (g) return g;
  const cols = Math.ceil(world.map.width / CELL);
  const rows = Math.ceil(world.map.height / CELL);
  const walls = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) walls[r * cols + c] = blocked(world, c * CELL + CELL / 2, r * CELL + CELL / 2, CLEARANCE) ? 1 : 0;
  g = { cols, rows, walls };
  cache.set(world.map, g);
  return g;
}

/** True if a circle of radius `r` can slide along the straight segment without touching anything. */
export function lineClear(world: SimWorld, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
  }
  return true;
}

const NEIGH: Array<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

/** nearest walkable cell to (x, y), searching outwards */
function snap(grid: Grid, x: number, y: number): number {
  const c0 = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / CELL)));
  const r0 = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / CELL)));
  if (!grid.walls[r0 * grid.cols + c0]) return r0 * grid.cols + c0;
  for (let d = 1; d < 8; d++)
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        if (!grid.walls[r * grid.cols + c]) return r * grid.cols + c;
      }
  return r0 * grid.cols + c0;
}

/** A* over the grid; returns waypoints (cell centres) from start to goal, or null. */
function findPath(world: SimWorld, sx: number, sy: number, tx: number, ty: number): Array<{ x: number; y: number }> | null {
  const grid = gridFor(world);
  const start = snap(grid, sx, sy);
  const goal = snap(grid, tx, ty);
  const n = grid.cols * grid.rows;
  const gCost = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const gx = goal % grid.cols;
  const gy = Math.floor(goal / grid.cols);
  const h = (i: number) => {
    const dx = Math.abs((i % grid.cols) - gx);
    const dy = Math.abs(Math.floor(i / grid.cols) - gy);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  // binary min-heap of [f, index]
  const heap: Array<[number, number]> = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  gCost[start] = 0;
  push(h(start), start);
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) {
      const out: Array<{ x: number; y: number }> = [];
      for (let i = goal; i !== -1; i = from[i]) out.push({ x: (i % grid.cols) * CELL + CELL / 2, y: Math.floor(i / grid.cols) * CELL + CELL / 2 });
      return out.reverse();
    }
    const cx = cur % grid.cols;
    const cy = Math.floor(cur / grid.cols);
    for (const [dx, dy, cost] of NEIGH) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      const ni = ny * grid.cols + nx;
      if (grid.walls[ni] || closed[ni]) continue;
      // no cutting corners between two wall cells
      if (dx && dy && (grid.walls[cy * grid.cols + nx] || grid.walls[ny * grid.cols + cx])) continue;
      const g = gCost[cur] + cost;
      if (g < gCost[ni]) {
        gCost[ni] = g;
        from[ni] = cur;
        push(g + h(ni), ni);
      }
    }
  }
  return null;
}

/**
 * The point a bot should walk toward to eventually reach (tx, ty): the
 * farthest waypoint along the A* path that it can walk to in a straight line.
 * Returns null when the straight line is already clear or no path exists.
 */
export function nextWaypoint(world: SimWorld, x: number, y: number, tx: number, ty: number, radius: number): { x: number; y: number } | null {
  if (lineClear(world, x, y, tx, ty, radius)) return null;
  const path = findPath(world, x, y, tx, ty);
  if (!path || path.length < 2) return null;
  for (let i = path.length - 1; i >= 1; i--) if (lineClear(world, x, y, path[i].x, path[i].y, radius)) return path[i];
  return path[1];
}
