import { useEffect } from 'react';
import type { Difficulty } from '../domain/tile';
import { isBoardValid } from '../domain/set';
import { usePuzzle } from '../state/usePuzzle';
import Board from './Board';
import Hand from './Hand';

type Props = {
  difficulty: Difficulty;
  onWin: (moves: number, par: number) => void;
  onHome: () => void;
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function PuzzleScreen({ difficulty, onWin, onHome }: Props) {
  const {
    puzzle,
    workingBoard,
    handTile,
    selection,
    selectedTileId,
    moveCount,
    solved,
    selectHand,
    onTileClick,
    onSetClick,
    onNewSet,
    checkSolution,
    reset,
    returnToHand,
  } = usePuzzle(difficulty);

  const canCheck = handTile === null && isBoardValid(workingBoard);
  const isHandSelected = selection.kind === 'hand';
  const isBoardTileSelected = selection.kind === 'board';

  // Check if selected tile is the hand tile (on the board)
  const selectedIsHandTile =
    isBoardTileSelected && selection.kind === 'board' && selection.tileId === puzzle.hand.id;

  useEffect(() => {
    if (solved) onWin(moveCount, puzzle.minMoves);
  }, [solved, moveCount, puzzle.minMoves, onWin]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: 480,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button className="btn-ghost" onClick={onHome} style={{ padding: '8px 12px', fontSize: 14 }}>
          ← Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            {DIFFICULTY_LABELS[difficulty]}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {moveCount} {puzzle.minMoves > 0 && <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>/ par {puzzle.minMoves}</span>}
          </div>
        </div>
        <button className="btn-ghost" onClick={reset} style={{ padding: '8px 12px', fontSize: 14 }}>
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: '10px 20px',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          background: 'var(--bg-surface)',
        }}
      >
        {handTile
          ? 'Tap your tile, then tap a set to place it. Rearrange the board so all sets are valid.'
          : canCheck
            ? 'All sets look valid! Tap "Check" to verify.'
            : 'Keep rearranging — some sets are still invalid.'}
      </div>

      {/* Board */}
      <Board
        board={workingBoard}
        selectedTileId={selectedTileId}
        onTileClick={onTileClick}
        onSetClick={onSetClick}
        onNewSetClick={onNewSet}
      />

      {/* Action bar */}
      {(selectedIsHandTile || canCheck) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 16px',
            justifyContent: 'center',
          }}
        >
          {selectedIsHandTile && (
            <button className="btn-secondary" onClick={returnToHand} style={{ fontSize: 14, padding: '8px 16px' }}>
              Return to hand
            </button>
          )}
          {canCheck && (
            <button className="btn-success" onClick={checkSolution} style={{ fontSize: 14, padding: '8px 16px' }}>
              Check solution
            </button>
          )}
        </div>
      )}

      {/* Hand */}
      <Hand tile={handTile} selected={isHandSelected} onTileClick={selectHand} />
    </div>
  );
}
