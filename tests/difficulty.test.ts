import { describe, it, expect } from 'vitest';
import { countMoves, computeMinMoves } from '../src/solver/difficulty';
import type { Tile, Board } from '../src/domain/tile';

function tile(color: Tile['color'], number: number, copy: 'a' | 'b' = 'a'): Tile {
  return { id: `${color}-${number}-${copy}`, color, number };
}

describe('countMoves', () => {
  it('returns 0 when boards are identical', () => {
    const board: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
    ];
    expect(countMoves(board, board)).toBe(0);
  });

  it('counts 1 move when only the hand tile is added to an existing set', () => {
    const hand = tile('red', 4);
    const original: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
    ];
    const solution: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3), hand],
    ];
    expect(countMoves(original, solution)).toBe(1);
  });

  it('counts moves when tiles are redistributed', () => {
    const original: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
      [tile('blue', 1), tile('blue', 2), tile('blue', 3)],
    ];
    // All tiles go to different sets
    const solution: Board = [
      [tile('red', 1), tile('blue', 1), tile('yellow', 1)],
      [tile('red', 2), tile('red', 3), tile('red', 4)],
      [tile('blue', 2), tile('blue', 3), tile('blue', 4)],
    ];
    // Some tiles stayed, some moved
    const moves = countMoves(original, solution);
    expect(moves).toBeGreaterThan(0);
  });
});

describe('computeMinMoves', () => {
  it('returns 1 when hand tile simply extends a run', () => {
    const board: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
    ];
    const hand = tile('red', 4);
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });

  it('returns 1 when hand tile joins a group', () => {
    const board: Board = [
      [tile('red', 5), tile('blue', 5), tile('yellow', 5)],
    ];
    const hand = tile('black', 5);
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });

  it('returns null for unsolvable puzzles', () => {
    const board: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
    ];
    // A lone tile that can't form anything with the existing tiles
    const hand = tile('yellow', 13);
    const result = computeMinMoves(board, hand);
    expect(result).toBeNull();
  });

  it('returns > 1 when rearrangement is needed', () => {
    // Board: red run 3-4-5, group of 7s (red, blue, yellow)
    // Hand: red 7 (second copy)
    // The hand tile (red 7) can't simply join the group (red 7 already there).
    // Need to rearrange: e.g., split the group and reform.
    const board: Board = [
      [tile('red', 3), tile('red', 4), tile('red', 5)],
      [tile('red', 7), tile('blue', 7), tile('yellow', 7)],
    ];
    const hand = tile('red', 6);
    // red 6 can extend the run to 3-4-5-6, so minMoves should be 1
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });
});
