import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Tile, Board, Difficulty } from '../domain/tile';
import { cloneBoard } from '../domain/board';
import { isBoardValid } from '../domain/set';
import { applyUndo, pushHistory, type Snapshot } from './history';
import puzzleLibrary from '../puzzles/library.json';

type PuzzleData = {
  id: string;
  board: Board;
  hand: Tile;
  minMoves: number;
  difficulty: Difficulty;
};

const ALL_PUZZLES = puzzleLibrary as PuzzleData[];

type PlayedHistory = Record<Difficulty, string[]>;
const EMPTY_PLAYED: PlayedHistory = { 'hard': [], 'extra-hard': [] };

type BoardSelTile = { tileId: string; setIndex: number };

/** Unified selection: any combination of board tiles plus optionally the hand tile. */
type Selection = { hand: boolean; tiles: BoardSelTile[] };

const EMPTY_SELECTION: Selection = { hand: false, tiles: [] };

function isEmptySelection(s: Selection): boolean {
  return !s.hand && s.tiles.length === 0;
}

type PuzzleState = {
  puzzle: PuzzleData;
  workingBoard: Board;
  /** Parallel to workingBoard: whether each set should render as a full-row
   *  pill. Locked at set creation so layout doesn't reflow as tiles move in/out. */
  setFullRow: boolean[];
  handTile: Tile | null;
  selection: Selection;
  moveCount: number;
  solved: boolean;
  history: Snapshot[];
};

const FULL_ROW_THRESHOLD = 3;
function lockFullRow(tileCount: number): boolean {
  return tileCount > FULL_ROW_THRESHOLD;
}
function initFullRow(board: Board): boolean[] {
  return board.map((set) => lockFullRow(set.length));
}
function dropEmpty(board: Board, fullRow: boolean[]): { board: Board; fullRow: boolean[] } {
  const nb: Board = [];
  const nf: boolean[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i].length > 0) {
      nb.push(board[i]);
      nf.push(fullRow[i]);
    }
  }
  return { board: nb, fullRow: nf };
}

const PLAYED_KEY = 'rumikube:played';
const LIB_VERSION_KEY = 'rumikube:libVersion';
// Bump when puzzle IDs are reused for new content so stored history clears.
// Bump 3 → 4: the played-history shape changed from a flat string[] to a
// per-difficulty record. Older clients had no extra-hard tier, so any
// pre-bump history is meaningless under the new shape.
const LIBRARY_VERSION = 4;

function ensureLibraryVersion() {
  try {
    const stored = Number(localStorage.getItem(LIB_VERSION_KEY) ?? 0);
    if (stored !== LIBRARY_VERSION) {
      localStorage.removeItem(PLAYED_KEY);
      localStorage.setItem(LIB_VERSION_KEY, String(LIBRARY_VERSION));
    }
  } catch {
    // ignore unavailable storage
  }
}

function loadPlayed(): PlayedHistory {
  ensureLibraryVersion();
  try {
    const raw = localStorage.getItem(PLAYED_KEY);
    if (!raw) return { 'hard': [], 'extra-hard': [] };
    const parsed = JSON.parse(raw);
    return {
      'hard': Array.isArray(parsed?.['hard']) ? parsed['hard'] : [],
      'extra-hard': Array.isArray(parsed?.['extra-hard']) ? parsed['extra-hard'] : [],
    };
  } catch {
    return { 'hard': [], 'extra-hard': [] };
  }
}

function savePlayed(played: PlayedHistory) {
  try {
    localStorage.setItem(PLAYED_KEY, JSON.stringify(played));
  } catch {
    // ignore quota / unavailable storage
  }
}

function markPlayed(difficulty: Difficulty, id: string) {
  const played = loadPlayed();
  if (!played[difficulty].includes(id)) {
    played[difficulty].push(id);
    savePlayed(played);
  }
}

/** Total puzzles in the library for one tier. */
export function totalPuzzles(difficulty: Difficulty): number {
  return ALL_PUZZLES.filter((p) => p.difficulty === difficulty).length;
}

/** How many puzzles the user has played in one tier. */
export function playedCount(difficulty: Difficulty): number {
  return Math.min(loadPlayed()[difficulty].length, totalPuzzles(difficulty));
}

/** True if every puzzle in this tier has been played. */
export function isTierExhausted(difficulty: Difficulty): boolean {
  const total = totalPuzzles(difficulty);
  return total > 0 && playedCount(difficulty) >= total;
}

/** Clear play history for one tier (or all tiers if omitted). */
export function resetPlayHistory(difficulty?: Difficulty) {
  if (!difficulty) {
    savePlayed({ ...EMPTY_PLAYED });
    return;
  }
  const played = loadPlayed();
  played[difficulty] = [];
  savePlayed(played);
}

/** Pick a random unplayed puzzle in the given tier. */
function pickPuzzle(difficulty: Difficulty, exclude?: string): PuzzleData | null {
  const tierPuzzles = ALL_PUZZLES.filter((p) => p.difficulty === difficulty);
  const played = new Set(loadPlayed()[difficulty]);
  const unplayed = tierPuzzles.filter((p) => !played.has(p.id));
  if (unplayed.length === 0) return null;
  const preferred = unplayed.filter((p) => p.id !== exclude);
  const candidates = preferred.length > 0 ? preferred : unplayed;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function initState(difficulty: Difficulty, exclude?: string): PuzzleState {
  const puzzle = pickPuzzle(difficulty, exclude);
  if (!puzzle) {
    // Shouldn't happen — HomeScreen blocks selection when exhausted. As a
    // last-resort safety net, reset this tier's history so the app can still function.
    resetPlayHistory(difficulty);
    const fallback = pickPuzzle(difficulty)!;
    return {
      puzzle: fallback,
      workingBoard: cloneBoard(fallback.board),
      setFullRow: initFullRow(fallback.board),
      handTile: { ...fallback.hand },
      selection: EMPTY_SELECTION,
      moveCount: 0,
      solved: false,
      history: [],
    };
  }
  return {
    puzzle,
    workingBoard: cloneBoard(puzzle.board),
    setFullRow: initFullRow(puzzle.board),
    handTile: { ...puzzle.hand },
    selection: EMPTY_SELECTION,
    moveCount: 0,
    solved: false,
    history: [],
  };
}

export function usePuzzle(difficulty: Difficulty) {
  const [state, setState] = useState<PuzzleState>(() => initState(difficulty));

  // Record a puzzle as played only once it's actually solved. markPlayed is
  // idempotent on id, so StrictMode's double-invocation is harmless here.
  useEffect(() => {
    if (state.solved) {
      markPlayed(state.puzzle.difficulty, state.puzzle.id);
    }
  }, [state.solved, state.puzzle.id, state.puzzle.difficulty]);

  const selectedTileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of state.selection.tiles) ids.add(t.tileId);
    if (state.selection.hand && state.handTile) ids.add(state.handTile.id);
    return ids;
  }, [state.selection, state.handTile]);

  /** Select/deselect the hand tile (preserves any board tiles already selected). */
  const selectHand = useCallback(() => {
    setState((s) => {
      if (s.solved || !s.handTile) return s;
      return { ...s, selection: { ...s.selection, hand: !s.selection.hand } };
    });
  }, []);

  /** Handle clicking a tile on the board. Toggles tile in/out of multi-selection. */
  const onTileClick = useCallback((tileId: string, setIndex: number) => {
    setState((s) => {
      if (s.solved) return s;

      const already = s.selection.tiles.some((t) => t.tileId === tileId);
      const tiles = already
        ? s.selection.tiles.filter((t) => t.tileId !== tileId)
        : [...s.selection.tiles, { tileId, setIndex }];
      return { ...s, selection: { hand: s.selection.hand, tiles } };
    });
  }, []);

  /** Handle clicking a set: moves the entire current selection (board tiles +
   *  optionally the hand tile) into the clicked set. */
  const onSetClick = useCallback((setIndex: number) => {
    setState((s) => {
      if (s.solved) return s;
      if (isEmptySelection(s.selection)) return s;

      const includeHand = s.selection.hand && s.handTile !== null;
      const bySource = new Map<number, string[]>();
      for (const sel of s.selection.tiles) {
        if (sel.setIndex === setIndex) continue; // already there
        const list = bySource.get(sel.setIndex) ?? [];
        list.push(sel.tileId);
        bySource.set(sel.setIndex, list);
      }
      if (bySource.size === 0 && !includeHand) {
        return { ...s, selection: EMPTY_SELECTION };
      }

      const toMove: Tile[] = [];
      for (const [srcIdx, ids] of bySource) {
        for (const id of ids) {
          const t = s.workingBoard[srcIdx]?.find((tt) => tt.id === id);
          if (t) toMove.push(t);
        }
      }
      if (includeHand) toMove.push(s.handTile!);

      const mapped = s.workingBoard.map((set, i) => {
        const removeIds = bySource.get(i);
        let next = removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
        if (i === setIndex) next = [...next, ...toMove];
        return next;
      });
      const cleaned = dropEmpty(mapped, s.setFullRow);

      return {
        ...s,
        history: pushHistory(s),
        workingBoard: cleaned.board,
        setFullRow: cleaned.fullRow,
        handTile: includeHand ? null : s.handTile,
        selection: EMPTY_SELECTION,
        moveCount: s.moveCount + bySource.size + (includeHand ? 1 : 0),
      };
    });
  }, []);

  /** Create a new set with the current selection (board tiles + optionally hand). */
  const onNewSet = useCallback(() => {
    setState((s) => {
      if (s.solved) return s;
      if (isEmptySelection(s.selection)) return s;

      const includeHand = s.selection.hand && s.handTile !== null;
      const bySource = new Map<number, string[]>();
      for (const sel of s.selection.tiles) {
        const list = bySource.get(sel.setIndex) ?? [];
        list.push(sel.tileId);
        bySource.set(sel.setIndex, list);
      }

      const toMove: Tile[] = [];
      for (const [srcIdx, ids] of bySource) {
        for (const id of ids) {
          const t = s.workingBoard[srcIdx]?.find((tt) => tt.id === id);
          if (t) toMove.push(t);
        }
      }
      if (includeHand) toMove.push(s.handTile!);
      if (toMove.length === 0) return { ...s, selection: EMPTY_SELECTION };

      const mapped = s.workingBoard.map((set, i) => {
        const removeIds = bySource.get(i);
        return removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
      });
      const cleaned = dropEmpty(mapped, s.setFullRow);
      cleaned.board.push(toMove);
      cleaned.fullRow.push(lockFullRow(toMove.length));

      return {
        ...s,
        history: pushHistory(s),
        workingBoard: cleaned.board,
        setFullRow: cleaned.fullRow,
        handTile: includeHand ? null : s.handTile,
        selection: EMPTY_SELECTION,
        moveCount: s.moveCount + bySource.size + (includeHand ? 1 : 0),
      };
    });
  }, []);

  /**
   * Move a tile from a source (hand or a board set) to a destination
   * (an existing set, a new set, or back to the hand).
   * Used by drag-and-drop; falls through to a no-op on invalid drops.
   */
  const performMove = useCallback(
    (
      source:
        | { kind: 'hand' }
        | { kind: 'board'; tiles: BoardSelTile[]; withHand?: boolean },
      dest: { kind: 'set'; index: number } | { kind: 'new-set' } | { kind: 'hand' },
    ) => {
      setState((s) => {
        if (s.solved) return s;

        // Hand source
        if (source.kind === 'hand') {
          if (!s.handTile) return s;
          if (dest.kind === 'hand') return { ...s, selection: EMPTY_SELECTION };
          const handTile = s.handTile;
          const newBoard: Board = s.workingBoard.map((set) => [...set]);
          const newFullRow = [...s.setFullRow];
          if (dest.kind === 'set') {
            newBoard[dest.index] = [...newBoard[dest.index], handTile];
          } else {
            newBoard.push([handTile]);
            newFullRow.push(lockFullRow(1));
          }
          return {
            ...s,
            history: pushHistory(s),
            workingBoard: newBoard,
            setFullRow: newFullRow,
            handTile: null,
            selection: EMPTY_SELECTION,
            moveCount: s.moveCount + 1,
          };
        }

        // Board source (1 or more tiles)
        if (source.tiles.length === 0) return s;

        // Drop on hand slot: only valid for a single-tile drag of the original hand tile
        if (dest.kind === 'hand') {
          if (source.tiles.length !== 1) return s;
          if (s.handTile !== null) return s;
          const { tileId, setIndex } = source.tiles[0];
          const tile = s.workingBoard[setIndex]?.find((t) => t.id === tileId);
          if (!tile || tile.id !== s.puzzle.hand.id) return s;
          const mapped = s.workingBoard.map((set, i) =>
            i === setIndex ? set.filter((t) => t.id !== tileId) : [...set],
          );
          const cleaned = dropEmpty(mapped, s.setFullRow);
          return {
            ...s,
            history: pushHistory(s),
            workingBoard: cleaned.board,
            setFullRow: cleaned.fullRow,
            handTile: tile,
            selection: EMPTY_SELECTION,
            moveCount: Math.max(0, s.moveCount - 1),
          };
        }

        // Group by source set; skip tiles already in the destination set
        const destIdx = dest.kind === 'set' ? dest.index : -1;
        const bySource = new Map<number, string[]>();
        for (const sel of source.tiles) {
          if (sel.setIndex === destIdx) continue;
          const list = bySource.get(sel.setIndex) ?? [];
          list.push(sel.tileId);
          bySource.set(sel.setIndex, list);
        }
        if (bySource.size === 0) return { ...s, selection: EMPTY_SELECTION };

        const includeHand = !!source.withHand && s.handTile !== null;

        const toMove: Tile[] = [];
        for (const [srcIdx, ids] of bySource) {
          for (const id of ids) {
            const t = s.workingBoard[srcIdx]?.find((tt) => tt.id === id);
            if (t) toMove.push(t);
          }
        }
        if (includeHand) toMove.push(s.handTile!);

        const mapped: Board = s.workingBoard.map((set, i) => {
          const removeIds = bySource.get(i);
          let next = removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
          if (dest.kind === 'set' && i === dest.index) next = [...next, ...toMove];
          return next;
        });
        const cleaned = dropEmpty(mapped, s.setFullRow);
        if (dest.kind === 'new-set') {
          cleaned.board.push(toMove);
          cleaned.fullRow.push(lockFullRow(toMove.length));
        }

        return {
          ...s,
          history: pushHistory(s),
          workingBoard: cleaned.board,
          setFullRow: cleaned.fullRow,
          handTile: includeHand ? null : s.handTile,
          selection: EMPTY_SELECTION,
          moveCount: s.moveCount + bySource.size + (includeHand ? 1 : 0),
        };
      });
    },
    [],
  );

  /** Check if the current board state is a valid solution. */
  const checkSolution = useCallback(() => {
    setState((s) => {
      if (s.handTile !== null) return s; // hand tile not placed yet
      if (!isBoardValid(s.workingBoard)) return s;
      return { ...s, solved: true };
    });
  }, []);

  /** Reset to original board state. */
  const reset = useCallback(() => {
    setState((s) => ({
      ...s,
      workingBoard: cloneBoard(s.puzzle.board),
      setFullRow: initFullRow(s.puzzle.board),
      handTile: { ...s.puzzle.hand },
      selection: EMPTY_SELECTION,
      moveCount: 0,
      solved: false,
      history: [],
    }));
  }, []);

  /** Undo the last move. */
  const undo = useCallback(() => {
    setState((s) => {
      const restored = applyUndo(s);
      if (restored === s) return s;
      return { ...restored, selection: EMPTY_SELECTION };
    });
  }, []);

  /** Pick up a tile from the board back to hand (only if it's the hand tile). */
  const returnToHand = useCallback(() => {
    setState((s) => {
      if (s.handTile !== null) return s; // hand already has a tile
      if (s.selection.hand) return s;
      if (s.selection.tiles.length !== 1) return s;

      const { tileId, setIndex: setIdx } = s.selection.tiles[0];
      const tile = s.workingBoard[setIdx].find((t) => t.id === tileId);
      if (!tile || tile.id !== s.puzzle.hand.id) return s; // can only return the hand tile

      const mapped = s.workingBoard.map((set, i) =>
        i === setIdx ? set.filter((t) => t.id !== tileId) : [...set],
      );
      const cleaned = dropEmpty(mapped, s.setFullRow);

      return {
        ...s,
        history: pushHistory(s),
        workingBoard: cleaned.board,
        setFullRow: cleaned.fullRow,
        handTile: tile,
        selection: EMPTY_SELECTION,
        moveCount: Math.max(0, s.moveCount - 1),
      };
    });
  }, []);

  /** Load next puzzle in the same tier. */
  const nextPuzzle = useCallback(() => {
    setState((s) => initState(s.puzzle.difficulty, s.puzzle.id));
  }, []);

  return {
    puzzle: state.puzzle,
    workingBoard: state.workingBoard,
    setFullRow: state.setFullRow,
    handTile: state.handTile,
    selection: state.selection,
    selectedTileIds,
    moveCount: state.moveCount,
    solved: state.solved,
    canUndo: state.history.length > 0,
    selectHand,
    onTileClick,
    onSetClick,
    onNewSet,
    performMove,
    checkSolution,
    reset,
    undo,
    returnToHand,
    nextPuzzle,
  };
}
