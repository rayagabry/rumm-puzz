import type { Board, Tile } from '../domain/tile';
import { findAllPartitions } from './partition';

/**
 * Difficulty metric: minimum number of set-to-set *transfers* ("moves")
 * needed to transform the original board (plus the hand tile) into a valid
 * solution.
 *
 * A "move" is one batch of tiles taken from a single source set (or the
 * hand) and placed into a single destination set. Multiple tiles going
 * between the same (source, destination) pair still count as a single
 * move — e.g. dragging a contiguous blue 8-9-10 from one run into another
 * run is one move, not three. Tiles that stay in a set whose identity is
 * preserved (i.e. the same set, maybe with tiles added or removed) don't
 * count as moves.
 *
 * Approach: pick the original→solution set matching σ that maximizes the
 * number of tiles that can stay (standard bipartite max-weight matching
 * on type-overlap), then enumerate unique permutations of per-type source
 * copies to destination positions — duplicate tiles give us freedom in
 * which physical copy fills which slot — and return the minimum number
 * of distinct non-stay (source, destination) pairs.
 */

const HAND_SOURCE = -1;

function tileKey(t: Tile): string {
  return `${t.color}-${t.number}`;
}

/** All distinct permutations of an integer array (duplicates deduped). */
function uniquePermutations(arr: number[]): number[][] {
  const sorted = [...arr].sort((a, b) => a - b);
  const result: number[][] = [];
  const used = new Array(sorted.length).fill(false);
  const current: number[] = [];
  function recurse(): void {
    if (current.length === sorted.length) {
      result.push([...current]);
      return;
    }
    let prev: number | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      if (prev !== null && sorted[i] === prev) continue;
      used[i] = true;
      current.push(sorted[i]);
      recurse();
      current.pop();
      used[i] = false;
      prev = sorted[i];
    }
  }
  recurse();
  return result;
}

/**
 * Type-based overlap: count how many tile types (color+number) appear in
 * both a and b, with multiplicity.
 */
function setOverlap(a: Tile[], b: Tile[]): number {
  const counts = new Map<string, number>();
  for (const t of a) {
    const k = tileKey(t);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let total = 0;
  for (const t of b) {
    const k = tileKey(t);
    const c = counts.get(k) ?? 0;
    if (c > 0) {
      total++;
      counts.set(k, c - 1);
    }
  }
  return total;
}

/**
 * Find a matching σ from original-set indices to solution-set indices that
 * maximizes the total type-overlap (= total tiles that can stay). Returns
 * σ as an array where σ[i] is the matched solution index, or -1 if the
 * original set i is unmatched.
 */
function findMaxStayMatching(weights: number[][], deadline?: number): number[] {
  const n = weights.length;
  const m = weights[0]?.length ?? 0;
  const bestSigma = new Array(n).fill(-1);
  if (n === 0 || m === 0) return bestSigma;

  let bestStays = -1;
  const curSigma = new Array(n).fill(-1);
  const usedSol = new Array(m).fill(false);
  let timedOut = false;
  let nodesSinceCheck = 0;

  function recurse(row: number, stays: number): void {
    if (timedOut) return;
    if (++nodesSinceCheck >= 10_000) {
      nodesSinceCheck = 0;
      if (deadline && Date.now() >= deadline) { timedOut = true; return; }
    }
    if (row === n) {
      if (stays > bestStays) {
        bestStays = stays;
        for (let i = 0; i < n; i++) bestSigma[i] = curSigma[i];
      }
      return;
    }
    // Unmatched
    curSigma[row] = -1;
    recurse(row + 1, stays);
    // Matched to any unused solution index
    for (let col = 0; col < m; col++) {
      if (usedSol[col]) continue;
      usedSol[col] = true;
      curSigma[row] = col;
      recurse(row + 1, stays + weights[row][col]);
      usedSol[col] = false;
    }
    curSigma[row] = -1;
  }
  recurse(0, 0);
  return bestSigma;
}

export function countMoves(
  originalBoard: Board,
  solutionBoard: Board,
  handTile?: Tile,
  deadline?: number,
): number {
  const sourcesByType = new Map<string, number[]>();
  const destsByType = new Map<string, number[]>();

  originalBoard.forEach((set, i) => {
    for (const t of set) {
      const k = tileKey(t);
      if (!sourcesByType.has(k)) sourcesByType.set(k, []);
      sourcesByType.get(k)!.push(i);
    }
  });
  if (handTile) {
    const k = tileKey(handTile);
    if (!sourcesByType.has(k)) sourcesByType.set(k, []);
    sourcesByType.get(k)!.push(HAND_SOURCE);
  }
  solutionBoard.forEach((set, j) => {
    for (const t of set) {
      const k = tileKey(t);
      if (!destsByType.has(k)) destsByType.set(k, []);
      destsByType.get(k)!.push(j);
    }
  });

  const typeSet = new Set<string>();
  for (const k of sourcesByType.keys()) typeSet.add(k);
  for (const k of destsByType.keys()) typeSet.add(k);
  const typeList = [...typeSet];

  // Supply and demand must match per tile type; otherwise the inputs are
  // inconsistent.
  for (const t of typeList) {
    const src = sourcesByType.get(t) ?? [];
    const dst = destsByType.get(t) ?? [];
    if (src.length !== dst.length) return Infinity;
  }

  // Find the matching that maximizes stays.
  const weights = originalBoard.map((orig) =>
    solutionBoard.map((sol) => setOverlap(orig, sol)),
  );
  const sigma = findMaxStayMatching(weights, deadline);

  // Enumerate per-type source-copy permutations under this matching.
  const permsByType = new Map<string, number[][]>();
  for (const t of typeList) {
    permsByType.set(t, uniquePermutations(sourcesByType.get(t) ?? []));
  }

  let best = Infinity;
  const pairs = new Set<string>();

  function recurse(tIdx: number): void {
    if (pairs.size >= best) return;
    if (deadline && tIdx % 4 === 0 && Date.now() >= deadline) return;
    if (tIdx === typeList.length) {
      if (pairs.size < best) best = pairs.size;
      return;
    }
    const type = typeList[tIdx];
    const dsts = destsByType.get(type) ?? [];
    const perms = permsByType.get(type)!;
    for (const perm of perms) {
      const added: string[] = [];
      for (let i = 0; i < perm.length; i++) {
        const s = perm[i];
        const d = dsts[i];
        const isStay = s >= 0 && sigma[s] === d;
        if (!isStay) {
          const key = `${s}|${d}`;
          if (!pairs.has(key)) {
            pairs.add(key);
            added.push(key);
          }
        }
      }
      recurse(tIdx + 1);
      for (const k of added) pairs.delete(k);
    }
  }
  recurse(0);
  return best;
}

/**
 * Find the minimum number of moves needed to solve a puzzle.
 * Enumerates valid partitions of (board tiles + hand tile) and picks the
 * one requiring the fewest moves from the original board.
 */
export function computeMinMoves(
  originalBoard: Board,
  handTile: Tile,
  maxPartitions: number = 100,
  maxMs?: number,
): number | null {
  const deadline = maxMs ? Date.now() + maxMs : undefined;
  const allTiles = [...originalBoard.flat(), handTile];
  const partitions = findAllPartitions(allTiles, maxPartitions);

  if (partitions.length === 0) return null;

  let minMoves = Infinity;
  for (const partition of partitions) {
    if (deadline && Date.now() >= deadline) break;
    const moves = countMoves(originalBoard, partition, handTile, deadline);
    if (moves < minMoves) minMoves = moves;
  }
  return isFinite(minMoves) ? minMoves : null;
}
