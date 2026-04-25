import { describe, it, expect } from 'vitest';
import { classifyPuzzle } from '../src/generator/classify';
import type { Tile, Board } from '../src/domain/tile';

function tile(color: Tile['color'], number: number, copy: 'a' | 'b' = 'a'): Tile {
  return { id: `${color}-${number}-${copy}`, color, number };
}

describe('classifyPuzzle', () => {
  it('tags a 1-move hand→run extension', () => {
    const board: Board = [
      [tile('red', 1), tile('red', 2), tile('red', 3)],
      [tile('blue', 5), tile('yellow', 5), tile('black', 5)],
    ];
    const hand = tile('red', 4);
    const sig = classifyPuzzle(board, hand)!;
    expect(sig).not.toBeNull();
    expect(sig.moveTags).toEqual(['hand->run']);
    expect(sig.structureTags).toEqual([]);
  });

  it('tags a 1-move hand→group extension', () => {
    const board: Board = [
      [tile('red', 5), tile('blue', 5), tile('yellow', 5)],
      [tile('red', 1), tile('red', 2), tile('red', 3)],
    ];
    const hand = tile('black', 5);
    const sig = classifyPuzzle(board, hand)!;
    expect(sig.moveTags).toEqual(['hand->group']);
    expect(sig.structureTags).toEqual([]);
  });

  it('tags the canonical blue-run split (run splits, hand forms new run with batch)', () => {
    const board: Board = [
      [tile('red', 4), tile('blue', 4, 'a'), tile('black', 4)],
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
    const sig = classifyPuzzle(board, hand)!;
    // Optimal: split blue run 3-11 into 3-7 and (hand 7)-8-11. The σ
    // matching may assign the original run either to the low or the high
    // residual; either way we expect exactly two move tags (one from hand,
    // one from the run source) with a run-shaped destination, and the
    // structure should mark the run as split + some new set produced.
    expect(sig.moveTags.length).toBe(2);
    expect(sig.moveTags.some((t) => t.startsWith('hand->'))).toBe(true);
    expect(sig.moveTags.some((t) => t.startsWith('run->'))).toBe(true);
    expect(sig.moveTags.every((t) => t.endsWith('run') || t.endsWith('new-run'))).toBe(true);
    expect(sig.structureTags).toContain('split');
    expect(sig.structureTags).toContain('new-set');
  });
});
