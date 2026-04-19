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

type Selection =
  | { kind: 'none' }
  | { kind: 'hand' }
  | { kind: 'board'; tileId: string; setIndex: number };

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

  const selectedTileId = useMemo(() => {
    if (state.selection.kind === 'board') return state.selection.tileId;
    if (state.selection.kind === 'hand' && state.handTile) return state.handTile.id;
    return null;
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

  /** Handle clicking a tile on the board. */
  const onTileClick = useCallback((tileId: string, setIndex: number) => {
    setState((s) => {
      if (s.solved) return s;

      // If nothing selected, select this tile
      if (s.selection.kind === 'none') {
        return { ...s, selection: { kind: 'board', tileId, setIndex } };
      }

      // If this tile is already selected, deselect
      if (s.selection.kind === 'board' && s.selection.tileId === tileId) {
        return { ...s, selection: { kind: 'none' } };
      }

      // If hand tile is selected and we click a board tile — place hand tile
      // into that tile's set
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

      // If a board tile is selected and we click another board tile —
      // move the selected tile to the clicked tile's set
      if (s.selection.kind === 'board') {
        const fromSet = s.selection.setIndex;
        const fromTileId = s.selection.tileId;

        if (fromSet === setIndex) {
          // Same set — just reselect
          return { ...s, selection: { kind: 'board', tileId, setIndex } };
        }

        // Move tile from one set to another
        const tile = s.workingBoard[fromSet].find((t) => t.id === fromTileId);
        if (!tile) return { ...s, selection: { kind: 'none' } };

        let newBoard = s.workingBoard.map((set, i) => {
          if (i === fromSet) return set.filter((t) => t.id !== fromTileId);
          if (i === setIndex) return [...set, tile];
          return [...set];
        });

        // Remove empty sets
        newBoard = newBoard.filter((set) => set.length > 0);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
        };
      }

      return s;
    });
  }, []);

  /** Handle clicking a set (for placing selected tile into it). */
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

      // Move selected board tile to clicked set
      if (s.selection.kind === 'board') {
        const fromSet = s.selection.setIndex;
        const fromTileId = s.selection.tileId;

        if (fromSet === setIndex) return { ...s, selection: { kind: 'none' } };

        const tile = s.workingBoard[fromSet].find((t) => t.id === fromTileId);
        if (!tile) return { ...s, selection: { kind: 'none' } };

        let newBoard = s.workingBoard.map((set, i) => {
          if (i === fromSet) return set.filter((t) => t.id !== fromTileId);
          if (i === setIndex) return [...set, tile];
          return [...set];
        });
        newBoard = newBoard.filter((set) => set.length > 0);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
        };
      }

      return s;
    });
  }, []);

  /** Create a new set with the selected tile. */
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
        const fromTileId = s.selection.tileId;
        const fromSetIdx = s.selection.setIndex;
        const foundTile = s.workingBoard[fromSetIdx].find((t) => t.id === fromTileId);
        if (!foundTile) return { ...s, selection: { kind: 'none' } };

        let newBoard = s.workingBoard.map((set, i) =>
          i === fromSetIdx ? set.filter((t) => t.id !== fromTileId) : [...set],
        );
        newBoard = newBoard.filter((set) => set.length > 0);
        newBoard.push([foundTile]);

        return {
          ...s,
          workingBoard: newBoard,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
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
      source: { kind: 'hand' } | { kind: 'board'; tileId: string; setIndex: number },
      dest: { kind: 'set'; index: number } | { kind: 'new-set' } | { kind: 'hand' },
    ) => {
      setState((s) => {
        if (s.solved) return s;

        let tile: Tile | null = null;
        if (source.kind === 'hand') {
          if (!s.handTile) return s;
          tile = s.handTile;
        } else {
          tile = s.workingBoard[source.setIndex]?.find((t) => t.id === source.tileId) ?? null;
        }
        if (!tile) return s;

        // No-op: dropping on own set
        if (source.kind === 'board' && dest.kind === 'set' && source.setIndex === dest.index) {
          return { ...s, selection: { kind: 'none' } };
        }
        // Hand→hand: no-op
        if (source.kind === 'hand' && dest.kind === 'hand') {
          return { ...s, selection: { kind: 'none' } };
        }

        // Drop on hand slot: only valid for the original hand tile, coming from the board
        if (dest.kind === 'hand') {
          if (source.kind !== 'board') return s;
          if (s.handTile !== null) return s;
          if (tile.id !== s.puzzle.hand.id) return s;
          let newBoard = s.workingBoard.map((set, i) =>
            i === source.setIndex ? set.filter((t) => t.id !== source.tileId) : [...set],
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

        // Add to dest before pruning so indices don't shift under us
        let newBoard: Board = s.workingBoard.map((set) => [...set]);
        if (source.kind === 'board') {
          newBoard[source.setIndex] = newBoard[source.setIndex].filter((t) => t.id !== source.tileId);
        }
        if (dest.kind === 'set') {
          newBoard[dest.index] = [...newBoard[dest.index], tile];
        } else {
          newBoard.push([tile]);
        }
        newBoard = newBoard.filter((set) => set.length > 0);

        return {
          ...s,
          workingBoard: newBoard,
          handTile: source.kind === 'hand' ? null : s.handTile,
          selection: { kind: 'none' },
          moveCount: s.moveCount + 1,
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

      const tileId = s.selection.tileId;
      const setIdx = s.selection.setIndex;
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
    selectedTileId,
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
