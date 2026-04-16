import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../src/generator/generate';
import { isValidSet, isBoardValid } from '../src/domain/set';
import { findPartition } from '../src/solver/partition';

describe('generatePuzzle', () => {
  it('generates a solvable easy puzzle', () => {
    // Try multiple seeds to find one that works
    let puzzle = null;
    for (let seed = 1; seed <= 200; seed++) {
      puzzle = generatePuzzle('easy', seed);
      if (puzzle) break;
    }
    expect(puzzle).not.toBeNull();
    expect(puzzle!.difficulty).toBe('easy');
    expect(puzzle!.minMoves).toBeGreaterThanOrEqual(1);
    expect(puzzle!.minMoves).toBeLessThanOrEqual(2);
    expect(isBoardValid(puzzle!.board)).toBe(true);

    // Verify the combined tiles can be partitioned
    const allTiles = [...puzzle!.board.flat(), puzzle!.hand];
    const partition = findPartition(allTiles);
    expect(partition).not.toBeNull();
  });

  it('generates a solvable medium puzzle', () => {
    let puzzle = null;
    for (let seed = 1; seed <= 500; seed++) {
      puzzle = generatePuzzle('medium', seed);
      if (puzzle) break;
    }
    expect(puzzle).not.toBeNull();
    expect(puzzle!.difficulty).toBe('medium');
    expect(puzzle!.minMoves).toBeGreaterThanOrEqual(3);
    expect(puzzle!.minMoves).toBeLessThanOrEqual(4);
    expect(isBoardValid(puzzle!.board)).toBe(true);
  });

  it('generated puzzle boards have all valid sets', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const puzzle = generatePuzzle('easy', seed);
      if (!puzzle) continue;
      for (const set of puzzle.board) {
        expect(isValidSet(set)).toBe(true);
      }
    }
  });
});
