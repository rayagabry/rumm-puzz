import { describe, it, expect } from 'vitest';
import { findPartition, findAllPartitions } from '../src/solver/partition';
import { isValidSet } from '../src/domain/set';
import type { Tile } from '../src/domain/tile';

function tile(color: Tile['color'], number: number, copy: 'a' | 'b' = 'a'): Tile {
  return { id: `${color}-${number}-${copy}`, color, number };
}

function allTileIds(board: Tile[][]): Set<string> {
  return new Set(board.flat().map((t) => t.id));
}

describe('findPartition', () => {
  it('partitions a simple run', () => {
    const tiles = [tile('red', 1), tile('red', 2), tile('red', 3)];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result!.every(isValidSet)).toBe(true);
  });

  it('partitions a simple group', () => {
    const tiles = [tile('red', 5), tile('blue', 5), tile('yellow', 5)];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result!.every(isValidSet)).toBe(true);
  });

  it('partitions two runs', () => {
    const tiles = [
      tile('red', 1), tile('red', 2), tile('red', 3),
      tile('blue', 7), tile('blue', 8), tile('blue', 9),
    ];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result!.every(isValidSet)).toBe(true);
  });

  it('partitions a mix of runs and groups', () => {
    const tiles = [
      tile('red', 1), tile('red', 2), tile('red', 3),
      tile('red', 5), tile('blue', 5), tile('yellow', 5),
    ];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.every(isValidSet)).toBe(true);
    // All input tiles are accounted for
    const ids = allTileIds(result!);
    expect(ids.size).toBe(6);
  });

  it('handles duplicate tiles (2 copies)', () => {
    const tiles = [
      tile('red', 1, 'a'), tile('red', 2, 'a'), tile('red', 3, 'a'),
      tile('red', 1, 'b'), tile('red', 2, 'b'), tile('red', 3, 'b'),
    ];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result!.every(isValidSet)).toBe(true);
  });

  it('returns null for unsolvable tiles', () => {
    // Only 2 tiles — can't form any valid set
    const tiles = [tile('red', 1), tile('red', 2)];
    expect(findPartition(tiles)).toBeNull();
  });

  it('returns null when a single tile is left over', () => {
    // 3 + 1 = 4 tiles, but the extra one can't form a set
    const tiles = [
      tile('red', 1), tile('red', 2), tile('red', 3),
      tile('yellow', 10),
    ];
    expect(findPartition(tiles)).toBeNull();
  });

  it('handles a complex board requiring both runs and groups', () => {
    const tiles = [
      // Group of 5s
      tile('red', 5), tile('blue', 5), tile('black', 5),
      // Run of blue
      tile('blue', 1), tile('blue', 2), tile('blue', 3),
    ];
    const result = findPartition(tiles);
    expect(result).not.toBeNull();
    expect(result!.every(isValidSet)).toBe(true);
    const ids = allTileIds(result!);
    expect(ids.size).toBe(6);
  });
});

describe('findAllPartitions', () => {
  it('finds multiple partitions when they exist', () => {
    // These tiles can be partitioned in multiple ways
    const tiles = [
      tile('red', 1), tile('blue', 1), tile('yellow', 1),
      tile('red', 2), tile('blue', 2), tile('yellow', 2),
      tile('red', 3), tile('blue', 3), tile('yellow', 3),
    ];
    const results = findAllPartitions(tiles, 50);
    expect(results.length).toBeGreaterThan(1);
    for (const board of results) {
      expect(board.every(isValidSet)).toBe(true);
      const ids = allTileIds(board);
      expect(ids.size).toBe(9);
    }
  });

  it('returns empty for unsolvable', () => {
    const tiles = [tile('red', 1), tile('red', 3)];
    const results = findAllPartitions(tiles);
    expect(results.length).toBe(0);
  });
});
