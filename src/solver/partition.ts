import type { Tile, Board } from '../domain/tile';
import type { Color } from '../domain/tile';

/**
 * Partition solver: given a multiset of tiles, find a valid partition into
 * runs (same color, consecutive, length >= 3) and groups (same number,
 * distinct colors, length 3 or 4).
 *
 * Uses a table-based approach: build a count[color][number] grid, then
 * backtrack by greedily consuming the lexicographically-first available tile
 * via either a run or a group.
 */

type Grid = number[][]; // grid[colorIdx][number 0..12] = count (0, 1, or 2)

function makeGrid(tiles: Tile[]): Grid {
  const colorIdx: Record<Color, number> = { red: 0, blue: 1, yellow: 2, black: 3 };
  const grid: Grid = Array.from({ length: 4 }, () => new Array(13).fill(0));
  for (const t of tiles) {
    grid[colorIdx[t.color]][t.number - 1]++;
  }
  return grid;
}

function gridKey(grid: Grid): string {
  return grid.map((row) => row.join('')).join('|');
}

function gridIsEmpty(grid: Grid): boolean {
  for (let c = 0; c < 4; c++) {
    for (let n = 0; n < 13; n++) {
      if (grid[c][n] > 0) return false;
    }
  }
  return true;
}

/** Find the first occupied cell (lowest color, lowest number). */
function firstTile(grid: Grid): [number, number] | null {
  for (let c = 0; c < 4; c++) {
    for (let n = 0; n < 13; n++) {
      if (grid[c][n] > 0) return [c, n];
    }
  }
  return null;
}

/**
 * Core backtracking solver. Returns one valid partition or null.
 * Results are expressed as [colorIdx, startNumber, length] for runs
 * and [number, colorIdxes[]] for groups.
 */
type RunDesc = { kind: 'run'; color: number; start: number; length: number };
type GroupDesc = { kind: 'group'; number: number; colors: number[] };
type SetDesc = RunDesc | GroupDesc;

function solve(
  grid: Grid,
  memo: Map<string, SetDesc[] | null>,
): SetDesc[] | null {
  if (gridIsEmpty(grid)) return [];

  const key = gridKey(grid);
  if (memo.has(key)) return memo.get(key)!;

  // Mark as in-progress (null = failed) to avoid infinite loops
  memo.set(key, null);

  const ft = firstTile(grid);
  if (!ft) return [];
  const [c, n] = ft;

  // Try runs starting at or including this tile
  // The tile at [c][n] must be part of whatever set we choose, since it's the
  // lexicographically-first tile. For runs, the run must start at or before n.
  // But since we always pick the first tile, the run must START at n (any run
  // starting before n would have been consumed by a prior step).
  for (let len = 13 - n; len >= 3; len--) {
    // Check: can we form a run of color c from n to n+len-1?
    let canRun = true;
    for (let i = 0; i < len; i++) {
      if (grid[c][n + i] <= 0) {
        canRun = false;
        break;
      }
    }
    if (!canRun) continue;

    // Consume the run
    for (let i = 0; i < len; i++) grid[c][n + i]--;
    const rest = solve(grid, memo);
    if (rest !== null) {
      const result = [{ kind: 'run' as const, color: c, start: n, length: len }, ...rest];
      memo.set(key, result);
      // Restore grid before returning (caller may need it)
      for (let i = 0; i < len; i++) grid[c][n + i]++;
      return result;
    }
    // Restore
    for (let i = 0; i < len; i++) grid[c][n + i]++;
  }

  // Try groups of size 4, then 3, that include color c at number n
  const availableColors = [0, 1, 2, 3].filter((cc) => cc !== c && grid[cc][n] > 0);

  // Size 4: need exactly 3 other colors
  if (availableColors.length >= 3) {
    // All combinations of 3 from availableColors
    const combos3 = combinations(availableColors, 3);
    for (const combo of combos3) {
      const groupColors = [c, ...combo].sort();
      for (const gc of groupColors) grid[gc][n]--;
      const rest = solve(grid, memo);
      if (rest !== null) {
        const result = [
          { kind: 'group' as const, number: n, colors: groupColors },
          ...rest,
        ];
        memo.set(key, result);
        for (const gc of groupColors) grid[gc][n]++;
        return result;
      }
      for (const gc of groupColors) grid[gc][n]++;
    }
  }

  // Size 3: need exactly 2 other colors
  if (availableColors.length >= 2) {
    const combos2 = combinations(availableColors, 2);
    for (const combo of combos2) {
      const groupColors = [c, ...combo].sort();
      for (const gc of groupColors) grid[gc][n]--;
      const rest = solve(grid, memo);
      if (rest !== null) {
        const result = [
          { kind: 'group' as const, number: n, colors: groupColors },
          ...rest,
        ];
        memo.set(key, result);
        for (const gc of groupColors) grid[gc][n]++;
        return result;
      }
      for (const gc of groupColors) grid[gc][n]++;
    }
  }

  // Also try size 3 group with exactly c + 2 others when only 2 available
  // (already covered above)

  memo.set(key, null);
  return null;
}

function combinations(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: number[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = combinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

const COLOR_NAMES: Color[] = ['red', 'blue', 'yellow', 'black'];

/** Convert internal set descriptors back to Tile arrays, matching by id from input tiles. */
function descriptorsToBoard(descs: SetDesc[], tiles: Tile[]): Board {
  // Build a pool indexed by (color, number) to pick specific tile objects
  const pool = new Map<string, Tile[]>();
  for (const t of tiles) {
    const key = `${t.color}-${t.number}`;
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key)!.push(t);
  }

  function take(color: Color, num: number): Tile {
    const key = `${color}-${num}`;
    const arr = pool.get(key)!;
    return arr.pop()!;
  }

  return descs.map((desc) => {
    if (desc.kind === 'run') {
      const color = COLOR_NAMES[desc.color];
      const set: Tile[] = [];
      for (let i = 0; i < desc.length; i++) {
        set.push(take(color, desc.start + i + 1));
      }
      return set;
    } else {
      return desc.colors.map((ci) => take(COLOR_NAMES[ci], desc.number + 1));
    }
  });
}

/**
 * Find a valid partition of the given tiles into runs and groups.
 * Returns the partition as a Board, or null if impossible.
 */
export function findPartition(tiles: Tile[]): Board | null {
  const grid = makeGrid(tiles);
  const memo = new Map<string, SetDesc[] | null>();
  const result = solve(grid, memo);
  if (!result) return null;
  return descriptorsToBoard(result, tiles);
}

/**
 * Find ALL valid partitions (up to maxResults) of the given tiles.
 * This is used by the difficulty scorer to find the minimum-move solution.
 */
export function findAllPartitions(tiles: Tile[], maxResults: number = 100): Board[] {
  const grid = makeGrid(tiles);
  const results: SetDesc[][] = [];

  function solveAll(g: Grid): void {
    if (results.length >= maxResults) return;
    if (gridIsEmpty(g)) {
      results.push([]);
      return;
    }

    const ft = firstTile(g);
    if (!ft) {
      results.push([]);
      return;
    }
    const [c, n] = ft;

    // Try runs
    for (let len = 3; len <= 13 - n; len++) {
      let canRun = true;
      for (let i = 0; i < len; i++) {
        if (g[c][n + i] <= 0) { canRun = false; break; }
      }
      if (!canRun) break; // Longer runs won't work either
      for (let i = 0; i < len; i++) g[c][n + i]--;
      const beforeLen = results.length;
      solveAll(g);
      for (let i = 0; i < len; i++) g[c][n + i]++;
      // Append this run descriptor to all new results
      for (let r = beforeLen; r < results.length; r++) {
        results[r] = [{ kind: 'run', color: c, start: n, length: len }, ...results[r]];
      }
      if (results.length >= maxResults) return;
    }

    // Try groups
    const availableColors = [0, 1, 2, 3].filter((cc) => cc !== c && g[cc][n] > 0);

    for (const size of [4, 3] as const) {
      const needed = size - 1;
      if (availableColors.length < needed) continue;
      const combos = combinations(availableColors, needed);
      for (const combo of combos) {
        const groupColors = [c, ...combo].sort();
        for (const gc of groupColors) g[gc][n]--;
        const beforeLen = results.length;
        solveAll(g);
        for (const gc of groupColors) g[gc][n]++;
        for (let r = beforeLen; r < results.length; r++) {
          results[r] = [{ kind: 'group', number: n, colors: groupColors }, ...results[r]];
        }
        if (results.length >= maxResults) return;
      }
    }
  }

  solveAll(grid);
  return results.map((descs) => descriptorsToBoard(descs, tiles));
}
