import type { Board, Tile } from '../domain/tile';
import { findAllPartitions } from './partition';

/**
 * Compute the overlap (number of shared tile IDs) between two sets.
 */
function setOverlap(a: Tile[], b: Tile[]): number {
  const ids = new Set(a.map((t) => t.id));
  let count = 0;
  for (const t of b) {
    if (ids.has(t.id)) count++;
  }
  return count;
}

/**
 * Maximum-weight bipartite matching using bitmask DP.
 * Rows = original sets, Cols = new sets.
 * weight[i][j] = overlap between original set i and new set j.
 * Returns the max total weight (= max tiles that stay in their original set).
 */
function maxWeightMatching(weights: number[][]): number {
  const rows = weights.length;
  const cols = weights[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return 0;

  // DP over bitmask of used columns
  // dp[mask] = max weight when we've assigned some subset of rows and used columns in mask
  const dp = new Array(1 << cols).fill(0);

  for (let row = 0; row < rows; row++) {
    // Process in reverse to avoid using same row twice
    const next = new Array(1 << cols).fill(0);
    for (let mask = 0; mask < 1 << cols; mask++) {
      // Option 1: don't match this row to any column
      next[mask] = Math.max(next[mask], dp[mask]);
      // Option 2: match this row to an unused column
      for (let col = 0; col < cols; col++) {
        if (mask & (1 << col)) continue; // column already used
        const newMask = mask | (1 << col);
        next[newMask] = Math.max(next[newMask], dp[mask] + weights[row][col]);
      }
    }
    for (let mask = 0; mask < 1 << cols; mask++) {
      dp[mask] = next[mask];
    }
  }

  let best = 0;
  for (let mask = 0; mask < 1 << cols; mask++) {
    best = Math.max(best, dp[mask]);
  }
  return best;
}

/**
 * Count the minimum number of tile "moves" to transform originalBoard into
 * solutionBoard. A tile counts as "moved" if it's not in the same matched set.
 *
 * The hand tile is always counted as a move (it's placed from hand to board).
 */
export function countMoves(originalBoard: Board, solutionBoard: Board): number {
  const totalTilesInSolution = solutionBoard.reduce((sum, s) => sum + s.length, 0);

  // Build weight matrix
  const weights = originalBoard.map((origSet) =>
    solutionBoard.map((solSet) => setOverlap(origSet, solSet)),
  );

  const stayed = maxWeightMatching(weights);
  return totalTilesInSolution - stayed;
}

/**
 * Find the minimum number of moves needed to solve a puzzle.
 * Enumerates valid partitions of (board tiles + hand tile) and picks the one
 * requiring the fewest moves from the original board.
 */
export function computeMinMoves(
  originalBoard: Board,
  handTile: Tile,
  maxPartitions: number = 100,
): number | null {
  const allTiles = [...originalBoard.flat(), handTile];
  const partitions = findAllPartitions(allTiles, maxPartitions);

  if (partitions.length === 0) return null;

  let minMoves = Infinity;
  for (const partition of partitions) {
    const moves = countMoves(originalBoard, partition);
    if (moves < minMoves) minMoves = moves;
  }
  return minMoves;
}
