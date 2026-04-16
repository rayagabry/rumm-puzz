import type { Tile, Board, TileSet } from './tile';

/** Get all tiles from a board as a flat array. */
export function allBoardTiles(board: Board): Tile[] {
  return board.flat();
}

/** Remove a tile by id from a set, returning the new set (or null if not found). */
export function removeTileFromSet(set: TileSet, tileId: string): TileSet | null {
  const idx = set.findIndex((t) => t.id === tileId);
  if (idx === -1) return null;
  return [...set.slice(0, idx), ...set.slice(idx + 1)];
}

/** Add a tile to a set at a given position. */
export function addTileToSet(set: TileSet, tile: Tile, position?: number): TileSet {
  const pos = position ?? set.length;
  return [...set.slice(0, pos), tile, ...set.slice(pos)];
}

/** Remove a tile from anywhere on the board. Returns [newBoard, removedFrom setIndex] or null. */
export function removeTileFromBoard(
  board: Board,
  tileId: string,
): { board: Board; setIndex: number } | null {
  for (let i = 0; i < board.length; i++) {
    const result = removeTileFromSet(board[i], tileId);
    if (result !== null) {
      const newBoard = [...board];
      if (result.length === 0) {
        // Remove empty set
        newBoard.splice(i, 1);
      } else {
        newBoard[i] = result;
      }
      return { board: newBoard, setIndex: i };
    }
  }
  return null;
}

/** Deep-clone a board. */
export function cloneBoard(board: Board): Board {
  return board.map((set) => set.map((tile) => ({ ...tile })));
}
