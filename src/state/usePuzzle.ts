import { useState, useCallback, useMemo } from 'react';
import type { Tile, Board, Difficulty } from '../domain/tile';
import { cloneBoard } from '../domain/board';
import { isBoardValid } from '../domain/set';
import puzzleLibrary from '../puzzles/library.json';

type PuzzleData = {
  id: string;
  board: Board;
  hand: Tile;
  minMoves: number;
  difficulty: Difficulty;
};

type BoardSelTile = { tileId: string; setIndex: number };

type Selection =
  | { kind: 'none' }
  | { kind: 'hand' }
  | { kind: 'board'; tiles: BoardSelTile[] };

type PuzzleState = {
  puzzle: PuzzleData;
  workingBoard: Board;
  handTile: Tile | null;
  selection: Selection;
  moveCount: number;
  solved: boolean;
};

/** Pick a random puzzle from the library for the given difficulty. */
function pickPuzzle(difficulty: Difficulty, exclude?: string): PuzzleData {
  const candidates = (puzzleLibrary as PuzzleData[]).filter(
    (p) => p.difficulty === difficulty && p.id !== exclude,
  );
  if (candidates.length === 0) {
    // Fallback: include all of that difficulty
    const all = (puzzleLibrary as PuzzleData[]).filter((p) => p.difficulty === difficulty);
    return all[Math.floor(Math.random() * all.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function initState(difficulty: Difficulty, exclude?: string): PuzzleState {
  const puzzle = pickPuzzle(difficulty, exclude);
  return {
    puzzle,
    workingBoard: cloneBoard(puzzle.board),
    handTile: { ...puzzle.hand },
    selection: { kind: 'none' },
    moveCount: 0,
    solved: false,
  };
}

export function usePuzzle(difficulty: Difficulty) {
  const [state, setState] = useState<PuzzleState>(() => initState(difficulty));

  const selectedTileIds = useMemo(() => {
    const ids = new Set<string>();
    if (state.selection.kind === 'board') {
      for (const t of state.selection.tiles) ids.add(t.tileId);
    } else if (state.selection.kind === 'hand' && state.handTile) {
      ids.add(state.handTile.id);
    }
    return ids;
  }, [state.selection, state.handTile]);

  /** Select/deselect the hand tile. */
  const selectHand = useCallback(() => {
    setState((s) => {
      if (s.solved || !s.handTile) return s;
      if (s.selection.kind === 'hand') {
        return { ...s, selection: { kind: 'none' } };
      }
      return { ...s, selection: { kind: 'hand' } };
    });
  }, []);

  /** Handle clicking a tile on the board. Toggles tile in/out of multi-selection. */
  const onTileClick = useCallback((tileId: string, setIndex: number) => {
    setState((s) => {
      if (s.solved) return s;

      // Hand tile is selected -> place it into this tile's set
      if (s.selection.kind === 'hand' && s.handTile) {
        const newBoard = s.workingBoard.map((set, i) =>
          i === setIndex ? [...set, s.handTile!] : [...set],
        );
        return {
          ...s,
          workingBoard: newBoard,
          handTile: null,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
        };
      }

      // No selection -> start a board selection with this tile
      if (s.selection.kind === 'none') {
        return { ...s, selection: { kind: 'board', tiles: [{ tileId, setIndex }] } };
      }

      // Board selection -> toggle this tile
      if (s.selection.kind === 'board') {
        const already = s.selection.tiles.some((t) => t.tileId === tileId);
        if (already) {
          const remaining = s.selection.tiles.filter((t) => t.tileId !== tileId);
          return {
            ...s,
            selection:
              remaining.length === 0
                ? { kind: 'none' }
                : { kind: 'board', tiles: remaining },
          };
        }
        return {
          ...s,
          selection: {
            kind: 'board',
            tiles: [...s.selection.tiles, { tileId, setIndex }],
          },
        };
      }

      return s;
    });
  }, []);

  /** Handle clicking a set (for placing selected tiles into it). */
  const onSetClick = useCallback((setIndex: number) => {
    setState((s) => {
      if (s.solved) return s;

      // Place hand tile into clicked set
      if (s.selection.kind === 'hand' && s.handTile) {
        const newBoard = s.workingBoard.map((set, i) =>
          i === setIndex ? [...set, s.handTile!] : [...set],
        );
        return {
          ...s,
          workingBoard: newBoard,
          handTile: null,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
        };
      }

      // Move all selected board tiles to clicked set
      if (s.selection.kind === 'board') {
        const bySource = new Map<number, string[]>();
        for (const sel of s.selection.tiles) {
          if (sel.setIndex === setIndex) continue; // already there
          const list = bySource.get(sel.setIndex) ?? [];
          list.push(sel.tileId);
          bySource.set(sel.setIndex, list);
        }
        if (bySource.size === 0) return { ...s, selection: { kind: 'none' } };

        const toMove: Tile[] = [];
        for (const [srcIdx, ids] of bySource) {
          for (const id of ids) {
            const t = s.workingBoard[srcIdx]?.find((tt) => tt.id === id);
            if (t) toMove.push(t);
          }
        }

        let newBoard = s.workingBoard.map((set, i) => {
          const removeIds = bySource.get(i);
          let next = removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
          if (i === setIndex) next = [...next, ...toMove];
          return next;
        });
        newBoard = newBoard.filter((set) => set.length > 0);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + bySource.size,
        };
      }

      return s;
    });
  }, []);

  /** Create a new set with the selected tile(s). */
  const onNewSet = useCallback(() => {
    setState((s) => {
      if (s.solved) return s;

      if (s.selection.kind === 'hand' && s.handTile) {
        return {
          ...s,
          workingBoard: [...s.workingBoard, [s.handTile]],
          handTile: null,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
        };
      }

      if (s.selection.kind === 'board') {
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
        if (toMove.length === 0) return { ...s, selection: { kind: 'none' } };

        let newBoard = s.workingBoard.map((set, i) => {
          const removeIds = bySource.get(i);
          return removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
        });
        newBoard = newBoard.filter((set) => set.length > 0);
        newBoard.push(toMove);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + bySource.size,
        };
      }

      return s;
    });
  }, []);

  /**
   * Move a tile from a source (hand or a board set) to a destination
   * (an existing set, a new set, or back to the hand).
   * Used by drag-and-drop; falls through to a no-op on invalid drops.
   */
  const performMove = useCallback(
    (
      source: { kind: 'hand' } | { kind: 'board'; tiles: BoardSelTile[] },
      dest: { kind: 'set'; index: number } | { kind: 'new-set' } | { kind: 'hand' },
    ) => {
      setState((s) => {
        if (s.solved) return s;

        // Hand source
        if (source.kind === 'hand') {
          if (!s.handTile) return s;
          if (dest.kind === 'hand') return { ...s, selection: { kind: 'none' } };
          const handTile = s.handTile;
          let newBoard: Board = s.workingBoard.map((set) => [...set]);
          if (dest.kind === 'set') {
            newBoard[dest.index] = [...newBoard[dest.index], handTile];
          } else {
            newBoard.push([handTile]);
          }
          return {
            ...s,
            workingBoard: newBoard,
            handTile: null,
            selection: { kind: 'none' },
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
          let newBoard = s.workingBoard.map((set, i) =>
            i === setIndex ? set.filter((t) => t.id !== tileId) : [...set],
          );
          newBoard = newBoard.filter((set) => set.length > 0);
          return {
            ...s,
            workingBoard: newBoard,
            handTile: tile,
            selection: { kind: 'none' },
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
        if (bySource.size === 0) return { ...s, selection: { kind: 'none' } };

        const toMove: Tile[] = [];
        for (const [srcIdx, ids] of bySource) {
          for (const id of ids) {
            const t = s.workingBoard[srcIdx]?.find((tt) => tt.id === id);
            if (t) toMove.push(t);
          }
        }

        let newBoard: Board = s.workingBoard.map((set, i) => {
          const removeIds = bySource.get(i);
          let next = removeIds ? set.filter((t) => !removeIds.includes(t.id)) : [...set];
          if (dest.kind === 'set' && i === dest.index) next = [...next, ...toMove];
          return next;
        });
        if (dest.kind === 'new-set') newBoard.push(toMove);
        newBoard = newBoard.filter((set) => set.length > 0);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + bySource.size,
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
      handTile: { ...s.puzzle.hand },
      selection: { kind: 'none' },
      moveCount: 0,
      solved: false,
    }));
  }, []);

  /** Pick up a tile from the board back to hand (only if it's the hand tile). */
  const returnToHand = useCallback(() => {
    setState((s) => {
      if (s.handTile !== null) return s; // hand already has a tile
      if (s.selection.kind !== 'board') return s;
      if (s.selection.tiles.length !== 1) return s;

      const { tileId, setIndex: setIdx } = s.selection.tiles[0];
      const tile = s.workingBoard[setIdx].find((t) => t.id === tileId);
      if (!tile || tile.id !== s.puzzle.hand.id) return s; // can only return the hand tile

      let newBoard = s.workingBoard.map((set, i) =>
        i === setIdx ? set.filter((t) => t.id !== tileId) : [...set],
      );
      newBoard = newBoard.filter((set) => set.length > 0);

      return {
        ...s,
        workingBoard: newBoard,
        handTile: tile,
        selection: { kind: 'none' },
        moveCount: Math.max(0, s.moveCount - 1),
      };
    });
  }, []);

  /** Load next puzzle. */
  const nextPuzzle = useCallback(() => {
    setState((s) => initState(s.puzzle.difficulty, s.puzzle.id));
  }, []);

  return {
    puzzle: state.puzzle,
    workingBoard: state.workingBoard,
    handTile: state.handTile,
    selection: state.selection,
    selectedTileIds,
    moveCount: state.moveCount,
    solved: state.solved,
    selectHand,
    onTileClick,
    onSetClick,
    onNewSet,
    performMove,
    checkSolution,
    reset,
    returnToHand,
    nextPuzzle,
  };
}
