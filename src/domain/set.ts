import type { Tile, TileSet } from './tile';

/**
 * A valid run: 3+ tiles of the same color with consecutive numbers.
 * Tiles should be sorted by number. No wraparound (13→1 is not valid).
 */
export function isValidRun(tiles: TileSet): boolean {
  if (tiles.length < 3 || tiles.length > 13) return false;
  const color = tiles[0].color;
  const sorted = [...tiles].sort((a, b) => a.number - b.number);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].color !== color) return false;
    if (i > 0 && sorted[i].number !== sorted[i - 1].number + 1) return false;
  }
  return true;
}

/**
 * A valid group: 3 or 4 tiles of the same number, each a distinct color.
 */
export function isValidGroup(tiles: TileSet): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;
  const num = tiles[0].number;
  const colors = new Set<string>();
  for (const tile of tiles) {
    if (tile.number !== num) return false;
    if (colors.has(tile.color)) return false;
    colors.add(tile.color);
  }
  return true;
}

/** A set is valid if it's a valid run or a valid group. */
export function isValidSet(tiles: TileSet): boolean {
  return isValidRun(tiles) || isValidGroup(tiles);
}

/** Check if every set on the board is valid. */
export function isBoardValid(board: TileSet[]): boolean {
  return board.length > 0 && board.every(isValidSet);
}

/**
 * Classify a valid set as 'run', 'group', or 'invalid'.
 */
export function classifySet(tiles: TileSet): 'run' | 'group' | 'invalid' {
  if (isValidRun(tiles)) return 'run';
  if (isValidGroup(tiles)) return 'group';
  return 'invalid';
}

/** Sort tiles within a set for display (runs by number, groups by color). */
export function sortSetForDisplay(tiles: TileSet): Tile[] {
  const kind = classifySet(tiles);
  if (kind === 'run') {
    return [...tiles].sort((a, b) => a.number - b.number);
  }
  const colorOrder: Record<string, number> = { red: 0, blue: 1, yellow: 2, black: 3 };
  return [...tiles].sort((a, b) => colorOrder[a.color] - colorOrder[b.color]);
}
