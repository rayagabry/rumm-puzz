import { describe, it, expect } from 'vitest';
import type { Tile, Board } from '../src/domain/tile';
import {
  snapshot,
  pushHistory,
  applyUndo,
  MAX_HISTORY,
  type Snapshot,
  type HistoricalState,
} from '../src/state/history';

const t = (id: string, number: number, color: Tile['color'] = 'red'): Tile => ({
  id,
  color,
  number,
});

const baseState = (overrides: Partial<HistoricalState> = {}): HistoricalState => ({
  workingBoard: [[t('a', 1), t('b', 2), t('c', 3)]],
  handTile: t('h', 5, 'blue'),
  moveCount: 0,
  history: [],
  solved: false,
  ...overrides,
});

describe('snapshot', () => {
  it('deep-clones the board so later mutations do not affect it', () => {
    const board: Board = [[t('a', 1), t('b', 2)]];
    const snap = snapshot({ workingBoard: board, handTile: null, moveCount: 0 });
    board[0].push(t('c', 3));
    board.push([t('d', 4)]);
    expect(snap.workingBoard).toHaveLength(1);
    expect(snap.workingBoard[0]).toHaveLength(2);
  });

  it('clones the hand tile', () => {
    const hand = t('h', 5);
    const snap = snapshot({ workingBoard: [], handTile: hand, moveCount: 3 });
    expect(snap.handTile).not.toBe(hand);
    expect(snap.handTile).toEqual(hand);
    expect(snap.moveCount).toBe(3);
  });

  it('preserves null hand', () => {
    const snap = snapshot({ workingBoard: [], handTile: null, moveCount: 0 });
    expect(snap.handTile).toBeNull();
  });
});

describe('pushHistory', () => {
  it('prepends a snapshot of the current state', () => {
    const s = baseState({ moveCount: 2 });
    const next = pushHistory(s);
    expect(next).toHaveLength(1);
    expect(next[0].moveCount).toBe(2);
  });

  it('keeps newest entries first', () => {
    let history: Snapshot[] = [];
    history = pushHistory({ ...baseState({ moveCount: 1 }), history });
    history = pushHistory({ ...baseState({ moveCount: 2 }), history });
    history = pushHistory({ ...baseState({ moveCount: 3 }), history });
    expect(history.map((h) => h.moveCount)).toEqual([3, 2, 1]);
  });

  it('caps at MAX_HISTORY entries, dropping the oldest', () => {
    let history: Snapshot[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      history = pushHistory({ ...baseState({ moveCount: i }), history });
    }
    expect(history).toHaveLength(MAX_HISTORY);
    // Newest move kept, oldest dropped.
    expect(history[0].moveCount).toBe(MAX_HISTORY + 4);
    expect(history[history.length - 1].moveCount).toBe(5);
  });
});

describe('applyUndo', () => {
  it('restores board, hand, and moveCount from the most recent snapshot', () => {
    const prev: Snapshot = {
      workingBoard: [[t('a', 1)]],
      handTile: t('h', 5),
      moveCount: 0,
    };
    const s = baseState({
      workingBoard: [[t('a', 1)], [t('h', 5)]],
      handTile: null,
      moveCount: 1,
      history: [prev],
    });
    const next = applyUndo(s);
    expect(next.workingBoard).toEqual(prev.workingBoard);
    expect(next.handTile).toEqual(prev.handTile);
    expect(next.moveCount).toBe(0);
    expect(next.history).toEqual([]);
  });

  it('pops only the most recent entry on each call', () => {
    const snaps: Snapshot[] = [
      { workingBoard: [[t('c', 3)]], handTile: null, moveCount: 2 },
      { workingBoard: [[t('b', 2)]], handTile: null, moveCount: 1 },
      { workingBoard: [[t('a', 1)]], handTile: null, moveCount: 0 },
    ];
    let s = baseState({ history: snaps });
    s = applyUndo(s);
    expect(s.moveCount).toBe(2);
    expect(s.history).toHaveLength(2);
    s = applyUndo(s);
    expect(s.moveCount).toBe(1);
    s = applyUndo(s);
    expect(s.moveCount).toBe(0);
    expect(s.history).toEqual([]);
  });

  it('returns input unchanged when history is empty', () => {
    const s = baseState({ history: [] });
    expect(applyUndo(s)).toBe(s);
  });

  it('returns input unchanged when solved', () => {
    const prev: Snapshot = { workingBoard: [], handTile: null, moveCount: 0 };
    const s = baseState({ solved: true, history: [prev] });
    expect(applyUndo(s)).toBe(s);
  });

  it('preserves unrelated state fields', () => {
    type Extended = HistoricalState & { extra: string };
    const prev: Snapshot = { workingBoard: [], handTile: null, moveCount: 0 };
    const s: Extended = { ...baseState({ history: [prev] }), extra: 'keep-me' };
    const next = applyUndo(s);
    expect(next.extra).toBe('keep-me');
  });
});

describe('snapshot + pushHistory + applyUndo round trip', () => {
  it('restores the exact board state captured before a mutation', () => {
    const original: Board = [[t('a', 1), t('b', 2), t('c', 3)]];
    let s = baseState({ workingBoard: original, handTile: t('h', 5), moveCount: 0 });

    // Simulate a move: snapshot prior state, then mutate.
    const newHistory = pushHistory(s);
    s = {
      ...s,
      workingBoard: [[t('a', 1), t('b', 2), t('c', 3), t('h', 5)]],
      handTile: null,
      moveCount: 1,
      history: newHistory,
    };

    const undone = applyUndo(s);
    expect(undone.workingBoard).toEqual(original);
    expect(undone.handTile).toEqual(t('h', 5));
    expect(undone.moveCount).toBe(0);
    expect(undone.history).toEqual([]);
  });
});
