import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../src/generator/generate';
import { isValidSet, isBoardValid } from '../src/domain/set';
import { findPartition } from '../src/solver/partition';

describe('generatePuzzle', () => {
  it('generates a solvable puzzle', () => {
    let puzzle = null;
    for (let seed = 1; seed <= 500; seed++) {
      puzzle = generatePuzzle(seed);
      if (puzzle) break;
    }
    expect(puzzle).not.toBeNull();
    expect(puzzle!.minMoves).toBeGreaterThanOrEqual(5);
    expect(puzzle!.minMoves).toBeLessThanOrEqual(8);
    expect(isBoardValid(puzzle!.board)).toBe(true);

    // Verify the combined tiles can be partitioned
    const allTiles = [...puzzle!.board.flat(), puzzle!.hand];
    const partition = findPartition(allTiles);
    expect(partition).not.toBeNull();
  });

  it('generated puzzle boards have all valid sets', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const puzzle = generatePuzzle(seed);
      if (!puzzle) continue;
      for (const set of puzzle.board) {
        expect(isValidSet(set)).toBe(true);
      }
    }
  });
});
