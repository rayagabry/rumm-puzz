import type { Tile, Board, Difficulty, Puzzle, Color } from '../domain/tile';
import { COLORS, makeRng, shuffle } from '../domain/tile';
import { findPartition, findAllPartitions } from '../solver/partition';
import { computeMinMoves } from '../solver/difficulty';
import { classifyPuzzle } from './classify';

export type PuzzleCandidate = Puzzle & { signature: string };

export const DIFFICULTY_RANGES: Record<Difficulty, [number, number]> = {
  'hard': [5, 8],
  'extra-hard': [7, 11],
};

export const DIFFICULTY_MAX_SET_SIZE: Record<Difficulty, number> = {
  'hard': 4,
  'extra-hard': 5,
};

export const DIFFICULTY_MIN_STARTING_SETS: Record<Difficulty, number> = {
  'hard': 0,
  'extra-hard': 9,
};

const MIN_SETS = 5;
const MAX_SETS = 8;

/**
 * Build a random valid solution board by assembling random runs and groups.
 * Returns a board where every set is valid, using tiles from the deck.
 *
 * Strategy: pick random set types (run or group), pick random parameters,
 * draw tiles from the remaining pool. Repeat until we have enough sets.
 */
function buildRandomSolution(
  rng: () => number,
  targetSets: number,
): Board | null {
  const pool = new Map<string, number>(); // "color-number" → count available
  for (const color of COLORS) {
    for (let n = 1; n <= 13; n++) {
      pool.set(`${color}-${n}`, 2);
    }
  }

  function available(color: Color, num: number): boolean {
    return (pool.get(`${color}-${num}`) ?? 0) > 0;
  }

  function take(color: Color, num: number): boolean {
    const key = `${color}-${num}`;
    const count = pool.get(key) ?? 0;
    if (count <= 0) return false;
    pool.set(key, count - 1);
    return true;
  }

  const sets: Array<Array<{ color: Color; number: number }>> = [];
  let attempts = 0;

  while (sets.length < targetSets && attempts < 200) {
    attempts++;
    const makeRun = rng() < 0.5;

    if (makeRun) {
      // Random run: pick color, start number, length
      const color = COLORS[Math.floor(rng() * 4)];
      const maxLen = 13;
      const start = Math.floor(rng() * 11) + 1; // 1..11
      const maxPossible = Math.min(maxLen - start + 1, 6); // cap length at 6
      if (maxPossible < 3) continue;
      const length = Math.floor(rng() * (maxPossible - 2)) + 3; // 3..maxPossible

      // Check availability
      let ok = true;
      for (let i = 0; i < length; i++) {
        if (!available(color, start + i)) { ok = false; break; }
      }
      if (!ok) continue;

      // Take tiles
      const set: Array<{ color: Color; number: number }> = [];
      for (let i = 0; i < length; i++) {
        take(color, start + i);
        set.push({ color, number: start + i });
      }
      sets.push(set);
    } else {
      // Random group: pick number, pick 3 or 4 distinct colors
      const num = Math.floor(rng() * 13) + 1;
      const shuffledColors = shuffle([...COLORS], rng);
      const size = rng() < 0.5 ? 3 : 4;
      const colors = shuffledColors.slice(0, size);

      // Check availability
      let ok = true;
      for (const c of colors) {
        if (!available(c, num)) { ok = false; break; }
      }
      if (!ok) continue;

      // Take tiles
      const set: Array<{ color: Color; number: number }> = [];
      for (const c of colors) {
        take(c, num);
        set.push({ color: c, number: num });
      }
      sets.push(set);
    }
  }

  if (sets.length < targetSets) return null;

  // Convert to Tile objects with proper IDs
  const usedCounts = new Map<string, number>();
  return sets.map((set) =>
    set.map((s) => {
      const baseKey = `${s.color}-${s.number}`;
      const count = (usedCounts.get(baseKey) ?? 0) + 1;
      usedCounts.set(baseKey, count);
      const copy = count === 1 ? 'a' : 'b';
      return { id: `${s.color}-${s.number}-${copy}`, color: s.color, number: s.number };
    }),
  );
}

/**
 * Given a solution board, try to produce a starting board (without the hand tile)
 * by repartitioning the remaining tiles into a different valid configuration.
 */
function makeStartingBoard(
  solutionWithoutHand: Tile[],
  rng: () => number,
): Board | null {
  // Shuffle the tile order so findPartition's lexicographic-first heuristic
  // explores different sub-trees on different seeds.
  const shuffled = shuffle(solutionWithoutHand, rng);
  // Enumerate up to N valid partitions (cheap because we cap), then pick one
  // at random. Picking the first partition (the previous behavior) biased
  // the library hard toward the same shape — most baseline hard puzzles
  // landed in just three signature buckets. Random selection from a wider
  // partition pool is the cheapest way to broaden technique variety.
  const all = findAllPartitions(shuffled, 32, 200_000);
  if (all.length === 0) {
    return findPartition(shuffled);
  }
  return all[Math.floor(rng() * all.length)];
}

/**
 * Returns true if the board has 3+ same-color runs covering the same number
 * range (e.g. red 11-13, blue 11-13, black 11-13). These puzzles are trivially
 * easy: the player can immediately see the sets can be regrouped by number.
 */
function hasParallelRuns(board: Board): boolean {
  const rangeCounts = new Map<string, number>();
  for (const set of board) {
    const numbers = set.map((t) => t.number);
    const colors = new Set(set.map((t) => t.color));
    // A run has all the same color and consecutive numbers
    if (colors.size !== 1) continue;
    const sorted = [...numbers].sort((a, b) => a - b);
    const isRun = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (!isRun) continue;
    const key = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    rangeCounts.set(key, (rangeCounts.get(key) ?? 0) + 1);
    if ((rangeCounts.get(key) ?? 0) >= 3) return true;
  }
  return false;
}

let puzzleCounter = 0;

/**
 * Generate a single puzzle for the given difficulty.
 * Returns null if generation fails within the attempt budget.
 */
export function generatePuzzle(
  seed: number,
  difficulty: Difficulty = 'hard',
  maxStartingSetSize: number = DIFFICULTY_MAX_SET_SIZE[difficulty],
  minStartingSets: number = DIFFICULTY_MIN_STARTING_SETS[difficulty],
): Puzzle | null {
  const rng = makeRng(seed);
  const [MIN_MOVES, MAX_MOVES] = DIFFICULTY_RANGES[difficulty];

  for (let attempt = 0; attempt < 100; attempt++) {
    const numSets = Math.floor(rng() * (MAX_SETS - MIN_SETS + 1)) + MIN_SETS;
    const solution = buildRandomSolution(rng, numSets);
    if (!solution) continue;

    // Pick a hand tile from one of the sets
    const allTiles = solution.flat();
    if (allTiles.length < 9) continue; // too small

    const handIdx = Math.floor(rng() * allTiles.length);
    const hand = allTiles[handIdx];
    const remaining = [...allTiles.slice(0, handIdx), ...allTiles.slice(handIdx + 1)];

    // Find a valid starting board from the remaining tiles
    // Try multiple shuffles
    let startingBoard: Board | null = null;
    for (let shuffleAttempt = 0; shuffleAttempt < 10; shuffleAttempt++) {
      startingBoard = makeStartingBoard(remaining, rng);
      if (startingBoard) break;
    }
    if (!startingBoard) continue;
    if (hasParallelRuns(startingBoard)) continue;
    if (startingBoard.some((s) => s.length > maxStartingSetSize)) continue;
    if (startingBoard.length < minStartingSets) continue;

    const actualMinMoves = computeMinMoves(startingBoard, hand, 100, 500);
    if (actualMinMoves === null) continue;
    if (actualMinMoves < MIN_MOVES || actualMinMoves > MAX_MOVES) continue;

    // Post-verify with a much larger budget. The fast check can miss a
    // shorter solution hiding behind many partitions — if verification
    // finds one below the difficulty floor, skip this puzzle.
    const verifiedMinMoves = computeMinMoves(startingBoard, hand, 2000, 5000);
    if (verifiedMinMoves === null) continue;
    if (verifiedMinMoves < MIN_MOVES || verifiedMinMoves > MAX_MOVES) continue;

    puzzleCounter++;
    return {
      id: `puzzle-${puzzleCounter}`,
      board: startingBoard,
      hand,
      solution,
      minMoves: verifiedMinMoves,
      difficulty,
    };
  }

  return null;
}

/**
 * Enumerate all valid starting-board variants for a single (solution, hand) pair.
 * Each variant is fully verified against the difficulty range and classified
 * by technique signature. Used by balanced-selection scripts that want to pick
 * variants with rare signatures rather than taking whichever partition arrived
 * first.
 */
export function generatePuzzleVariants(
  seed: number,
  difficulty: Difficulty = 'hard',
  maxStartingSetSize: number = DIFFICULTY_MAX_SET_SIZE[difficulty],
  maxVariants: number = 32,
  minStartingSets: number = DIFFICULTY_MIN_STARTING_SETS[difficulty],
): PuzzleCandidate[] {
  const rng = makeRng(seed);
  const [MIN_MOVES, MAX_MOVES] = DIFFICULTY_RANGES[difficulty];

  for (let attempt = 0; attempt < 100; attempt++) {
    const numSets = Math.floor(rng() * (MAX_SETS - MIN_SETS + 1)) + MIN_SETS;
    const solution = buildRandomSolution(rng, numSets);
    if (!solution) continue;

    const allTiles = solution.flat();
    if (allTiles.length < 9) continue;

    const handIdx = Math.floor(rng() * allTiles.length);
    const hand = allTiles[handIdx];
    const remaining = [...allTiles.slice(0, handIdx), ...allTiles.slice(handIdx + 1)];

    const shuffled = shuffle(remaining, rng);
    const partitions = findAllPartitions(shuffled, maxVariants, 200_000);
    if (partitions.length === 0) continue;

    const candidates: PuzzleCandidate[] = [];
    for (const startingBoard of partitions) {
      if (hasParallelRuns(startingBoard)) continue;
      if (startingBoard.some((s) => s.length > maxStartingSetSize)) continue;
      if (startingBoard.length < minStartingSets) continue;

      // Fast verification only — caller is expected to slow-verify the
      // variants it actually selects, since slow-verifying every candidate
      // makes large pool builds intractable.
      const fast = computeMinMoves(startingBoard, hand, 200, 1000);
      if (fast === null || fast < MIN_MOVES || fast > MAX_MOVES) continue;

      const sig = classifyPuzzle(startingBoard, hand, 500, 1500);
      if (!sig) continue;

      puzzleCounter++;
      candidates.push({
        id: `puzzle-${puzzleCounter}`,
        board: startingBoard,
        hand,
        solution,
        minMoves: fast,
        difficulty,
        signature: sig.signature,
      });
    }

    if (candidates.length > 0) return candidates;
  }

  return [];
}

/**
 * Generate a library of puzzles.
 */
export function generateLibrary(
  totalPuzzles: number = 50,
  baseSeed: number = 42,
  difficulty: Difficulty = 'hard',
  onProgress?: (count: number, attempts: number, puzzle: Puzzle) => void,
): Puzzle[] {
  const puzzles: Puzzle[] = [];
  let count = 0;
  let seed = baseSeed;
  let attempts = 0;

  while (count < totalPuzzles && attempts - count < totalPuzzles * 20) {
    seed++;
    attempts++;
    const puzzle = generatePuzzle(seed, difficulty);
    if (puzzle) {
      puzzle.id = `${difficulty}-${count + 1}`;
      puzzles.push(puzzle);
      count++;
      onProgress?.(count, attempts, puzzle);
    }
  }

  if (count < totalPuzzles) {
    console.warn(
      `Only generated ${count}/${totalPuzzles} puzzles after ${attempts} attempts`,
    );
  }

  return puzzles;
}
