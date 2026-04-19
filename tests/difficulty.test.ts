import { describe, it, expect } from 'vitest';
import { countMoves, computeMinMoves } from '../src/solver/difficulty';
import type { Tile, Board } from '../src/domain/tile';

function tile(color: Tile['color'], number: number, copy: 'a' | 'b' = 'a'): Tile {
  return { id: `${color}-${number}-${copy}`, color, number };
}

describe('countMoves', () => {
  it('returns 0 when boards are identical and there is no hand tile', () => {
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
    expect(countMoves(original, solution, hand)).toBe(1);
  });

  it('batches contiguous tiles moved between the same pair of sets', () => {
    // Splitting blue 3-11 into blue 3-7 and blue 7-11 by placing a hand
    // blue-7 between them. Four tiles (blue 8,9,10,11) move from the
    // original run into the new run — that's ONE move, not four — plus
    // the hand tile's placement — total two moves.
    const original: Board = [
      [
        tile('blue', 3),
        tile('blue', 4),
        tile('blue', 5),
        tile('blue', 6),
        tile('blue', 7, 'a'),
        tile('blue', 8),
        tile('blue', 9),
        tile('blue', 10),
        tile('blue', 11),
      ],
    ];
    const hand = tile('blue', 7, 'b');
    const solution: Board = [
      [
        tile('blue', 3),
        tile('blue', 4),
        tile('blue', 5),
        tile('blue', 6),
        tile('blue', 7, 'a'),
      ],
      [
        tile('blue', 7, 'b'),
        tile('blue', 8),
        tile('blue', 9),
        tile('blue', 10),
        tile('blue', 11),
      ],
    ];
    expect(countMoves(original, solution, hand)).toBe(2);
  });

  it('counts two moves when tiles from the same source go to different destinations', () => {
    // A 4-group [red, blue, yellow, black 4] breaks up: red-4 and black-4
    // move into different new sets. Two moves, not one.
    const hand = tile('blue', 5);
    // New solution: red-4 extends a red run; black-4 extends a black run.
    // (We pre-seed runs in the original that can accept them by adding
    // them as separate original sets.)
    const originalWithRuns: Board = [
      [tile('red', 4), tile('blue', 4), tile('yellow', 4), tile('black', 4)],
      [tile('red', 5), tile('red', 6), tile('red', 7)],
      [tile('black', 5), tile('black', 6), tile('black', 7)],
      [tile('blue', 6), tile('blue', 7), tile('blue', 8)],
    ];
    const solution: Board = [
      [tile('blue', 4), tile('yellow', 4)],
      [tile('red', 4), tile('red', 5), tile('red', 6), tile('red', 7)],
      [tile('black', 4), tile('black', 5), tile('black', 6), tile('black', 7)],
      [tile('blue', 5), tile('blue', 6), tile('blue', 7), tile('blue', 8)],
    ];
    // red-4 moves: group → red-run (1 move)
    // black-4 moves: group → black-run (1 move, different destination)
    // hand blue-5 moves: hand → blue-run (1 move)
    // blue-4 and yellow-4 stay (the group is matched to the first solution set,
    // even though it now has only 2 tiles — countMoves doesn't care about set
    // validity, only transfers).
    expect(countMoves(originalWithRuns, solution, hand)).toBe(3);
  });

  it('counts one move when two tiles from the same source go to the same destination', () => {
    // red-4 and black-4 both move from the original group into the same
    // new set. That's ONE move (one batch), not two.
    const original: Board = [
      [tile('red', 4), tile('blue', 4), tile('black', 4)],
      [tile('yellow', 4), tile('yellow', 5), tile('yellow', 6)],
    ];
    const hand = tile('red', 5);
    const solution: Board = [
      [tile('blue', 4)], // vestigial; set validity not checked here
      [tile('yellow', 4), tile('yellow', 5), tile('yellow', 6), tile('red', 5)],
      [tile('red', 4), tile('black', 4)], // red-4 and black-4 together
    ];
    // Transfers:
    //   - red-4 from group → new pair set  ┐ same (src, dst)
    //   - black-4 from group → new pair set ┘ = 1 move
    //   - hand red-5 → yellow run = 1 move
    // Total: 2 moves
    expect(countMoves(original, solution, hand)).toBe(2);
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
    const hand = tile('yellow', 13);
    const result = computeMinMoves(board, hand);
    expect(result).toBeNull();
  });

  it('returns 1 when hand tile just extends the run (group present but untouched)', () => {
    const board: Board = [
      [tile('red', 3), tile('red', 4), tile('red', 5)],
      [tile('red', 7), tile('blue', 7), tile('yellow', 7)],
    ];
    const hand = tile('red', 6);
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });

  it('returns 1 when duplicate tiles exist and only the hand tile needs placing', () => {
    const board: Board = [
      [tile('red', 3, 'a'), tile('red', 4, 'a'), tile('red', 5, 'a')],
      [tile('red', 3, 'b'), tile('red', 4, 'b'), tile('red', 5, 'b')],
    ];
    const hand = tile('red', 6, 'a');
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });

  it('returns 1 when hand extends a run that shares a number with a group', () => {
    const board: Board = [
      [tile('red', 3, 'a'), tile('red', 4, 'a'), tile('red', 5, 'a')],
      [tile('red', 3, 'b'), tile('blue', 3, 'a'), tile('yellow', 3, 'a')],
    ];
    const hand = tile('red', 6, 'a');
    const result = computeMinMoves(board, hand);
    expect(result).toBe(1);
  });

  it('returns 2 for the canonical blue-run split puzzle', () => {
    // This is the puzzle shown in the screenshot that motivated the new
    // metric: blue 3-11 on the board, a group of 4s, a yellow 8-12 run,
    // and a hand blue-7. The old metric called this "par 5"; under the
    // new "batched moves" metric it's just 2 moves — move blue 8-11 to a
    // new set and place the hand 7 with them.
    const board: Board = [
      [tile('red', 4), tile('blue', 4), tile('black', 4)],
      [
        tile('blue', 3),
        tile('blue', 4, 'b'),
        tile('blue', 5),
        tile('blue', 6),
        tile('blue', 7, 'a'),
        tile('blue', 8),
        tile('blue', 9),
        tile('blue', 10),
        tile('blue', 11),
      ],
      [
        tile('yellow', 8),
        tile('yellow', 9),
        tile('yellow', 10),
        tile('yellow', 11),
        tile('yellow', 12),
      ],
    ];
    const hand = tile('blue', 7, 'b');
    // Slight tile-duplicate conflict (blue-4 appears in the group and the
    // long run using the two copies 'a' and 'b'); the solver uses types,
    // so this is fine as long as two distinct ids exist.
    const result = computeMinMoves(board, hand, 500);
    expect(result).toBe(2);
  });
});
