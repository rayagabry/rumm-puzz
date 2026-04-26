import type { Tile, Board } from '../domain/tile';
import { cloneBoard } from '../domain/board';

export type Snapshot = {
  workingBoard: Board;
  setFullRow: boolean[];
  handTile: Tile | null;
  moveCount: number;
};

export const MAX_HISTORY = 50;

export type HistoricalState = Snapshot & {
  history: Snapshot[];
  solved: boolean;
};

export function snapshot(s: Snapshot): Snapshot {
  return {
    workingBoard: cloneBoard(s.workingBoard),
    setFullRow: [...s.setFullRow],
    handTile: s.handTile ? { ...s.handTile } : null,
    moveCount: s.moveCount,
  };
}

export function pushHistory(s: Snapshot & { history: Snapshot[] }): Snapshot[] {
  const next = [snapshot(s), ...s.history];
  return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
}

/** Restore the most recent snapshot. Returns the input unchanged if solved or
 *  history is empty. Selection is the caller's concern. */
export function applyUndo<T extends HistoricalState>(s: T): T {
  if (s.solved) return s;
  if (s.history.length === 0) return s;
  const [prev, ...rest] = s.history;
  return {
    ...s,
    workingBoard: prev.workingBoard,
    setFullRow: prev.setFullRow,
    handTile: prev.handTile,
    moveCount: prev.moveCount,
    history: rest,
  };
}
