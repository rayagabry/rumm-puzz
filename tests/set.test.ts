import { describe, it, expect } from 'vitest';
import { isValidRun, isValidGroup, isValidSet } from '../src/domain/set';
import type { Tile } from '../src/domain/tile';

function tile(color: Tile['color'], number: number, copy: 'a' | 'b' = 'a'): Tile {
  return { id: `${color}-${number}-${copy}`, color, number };
}

describe('isValidRun', () => {
  it('accepts a 3-tile run', () => {
    expect(isValidRun([tile('red', 1), tile('red', 2), tile('red', 3)])).toBe(true);
  });

  it('accepts a long run', () => {
    const run = Array.from({ length: 7 }, (_, i) => tile('blue', 4 + i));
    expect(isValidRun(run)).toBe(true);
  });

  it('accepts unsorted tiles (sorts internally)', () => {
    expect(isValidRun([tile('red', 3), tile('red', 1), tile('red', 2)])).toBe(true);
  });

  it('rejects run of length 2', () => {
    expect(isValidRun([tile('red', 1), tile('red', 2)])).toBe(false);
  });

  it('rejects mixed colors', () => {
    expect(isValidRun([tile('red', 1), tile('blue', 2), tile('red', 3)])).toBe(false);
  });

  it('rejects non-consecutive numbers', () => {
    expect(isValidRun([tile('red', 1), tile('red', 3), tile('red', 5)])).toBe(false);
  });

  it('rejects wrap-around (13, 1, 2)', () => {
    expect(isValidRun([tile('red', 13), tile('red', 1), tile('red', 2)])).toBe(false);
  });

  it('rejects duplicate numbers (not a valid run)', () => {
    expect(
      isValidRun([tile('red', 5, 'a'), tile('red', 5, 'b'), tile('red', 6)]),
    ).toBe(false);
  });
});

describe('isValidGroup', () => {
  it('accepts a 3-color group', () => {
    expect(
      isValidGroup([tile('red', 7), tile('blue', 7), tile('yellow', 7)]),
    ).toBe(true);
  });

  it('accepts a 4-color group', () => {
    expect(
      isValidGroup([
        tile('red', 7),
        tile('blue', 7),
        tile('yellow', 7),
        tile('black', 7),
      ]),
    ).toBe(true);
  });

  it('rejects 2-tile group', () => {
    expect(isValidGroup([tile('red', 7), tile('blue', 7)])).toBe(false);
  });

  it('rejects 5-tile group', () => {
    expect(
      isValidGroup([
        tile('red', 7),
        tile('blue', 7),
        tile('yellow', 7),
        tile('black', 7),
        tile('red', 7, 'b'),
      ]),
    ).toBe(false);
  });

  it('rejects duplicate colors', () => {
    expect(
      isValidGroup([tile('red', 7), tile('red', 7, 'b'), tile('blue', 7)]),
    ).toBe(false);
  });

  it('rejects different numbers', () => {
    expect(
      isValidGroup([tile('red', 7), tile('blue', 8), tile('yellow', 7)]),
    ).toBe(false);
  });
});

describe('isValidSet', () => {
  it('accepts a run', () => {
    expect(isValidSet([tile('red', 4), tile('red', 5), tile('red', 6)])).toBe(true);
  });

  it('accepts a group', () => {
    expect(
      isValidSet([tile('red', 4), tile('blue', 4), tile('yellow', 4)]),
    ).toBe(true);
  });

  it('rejects neither run nor group', () => {
    expect(isValidSet([tile('red', 4), tile('blue', 5)])).toBe(false);
  });
});
