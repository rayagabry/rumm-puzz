import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../domain/tile';
import { isBoardValid } from '../domain/set';
import { usePuzzle } from '../state/usePuzzle';
import Board from './Board';
import Hand from './Hand';
import Tile from './Tile';

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

type DragSource =
  | { kind: 'hand' }
  | { kind: 'board'; tileId: string; setIndex: number };

type DropTarget =
  | { kind: 'set'; index: number }
  | { kind: 'new-set' }
  | { kind: 'hand' };

type DragState = {
  source: DragSource;
  tileId: string;
  x: number;
  y: number;
  hover: DropTarget | null;
};

function resolveDropTarget(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const target = (el as HTMLElement).closest('[data-drop-kind]') as HTMLElement | null;
  if (!target) return null;
  const kind = target.dataset.dropKind;
  if (kind === 'set') {
    const idx = Number(target.dataset.dropIndex);
    return Number.isFinite(idx) ? { kind: 'set', index: idx } : null;
  }
  if (kind === 'new-set') return { kind: 'new-set' };
  if (kind === 'hand') return { kind: 'hand' };
  return null;
}

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
    performMove,
    checkSolution,
    reset,
    returnToHand,
  } = usePuzzle(difficulty);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const canCheck = handTile === null && isBoardValid(workingBoard);
  const isHandSelected = selection.kind === 'hand';
  const isBoardTileSelected = selection.kind === 'board';

  const selectedIsHandTile =
    isBoardTileSelected && selection.kind === 'board' && selection.tileId === puzzle.hand.id;

  useEffect(() => {
    if (solved) onWin(moveCount, puzzle.minMoves);
  }, [solved, moveCount, puzzle.minMoves, onWin]);

  const draggedTile = (() => {
    if (!drag) return null;
    const src = drag.source;
    if (src.kind === 'hand') return handTile;
    const set = workingBoard[src.setIndex];
    return set?.find((t) => t.id === src.tileId) ?? null;
  })();

  const startDrag = (source: DragSource, tileId: string, e: PointerEvent) => {
    const initial: DragState = {
      source,
      tileId,
      x: e.clientX,
      y: e.clientY,
      hover: resolveDropTarget(e.clientX, e.clientY),
    };
    setDrag(initial);
    dragRef.current = initial;

    const onMove = (ev: PointerEvent) => {
      const hover = resolveDropTarget(ev.clientX, ev.clientY);
      const next: DragState = {
        ...(dragRef.current ?? initial),
        x: ev.clientX,
        y: ev.clientY,
        hover,
      };
      dragRef.current = next;
      setDrag(next);
    };
    const finish = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', onCancel);
      const target = resolveDropTarget(ev.clientX, ev.clientY);
      if (target) performMove(source, target);
      setDrag(null);
      dragRef.current = null;
    };
    const onCancel = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', onCancel);
      setDrag(null);
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', onCancel);
  };

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
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button className="btn-secondary" onClick={onHome} style={{ padding: '8px 12px', fontSize: 14 }}>
          ← Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {DIFFICULTY_LABELS[difficulty]}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Moves: {moveCount} {puzzle.minMoves > 0 && <span style={{ color: 'var(--text-muted)' }}>/ par {puzzle.minMoves}</span>}
          </div>
        </div>
        <button className="btn-secondary" onClick={reset} style={{ padding: '8px 12px', fontSize: 14 }}>
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          background: 'var(--bg-surface)',
        }}
      >
        {handTile
          ? 'Drag your tile onto a set (or tap tile then set). Rearrange so all sets are valid.'
          : canCheck
            ? 'All sets look valid! Tap "Check" to verify.'
            : 'Keep rearranging — some sets are still invalid.'}
      </div>

      {/* Board */}
      <Board
        board={workingBoard}
        selectedTileId={selectedTileId}
        draggedTileId={drag?.tileId ?? null}
        dragActive={!!drag}
        dropHover={drag?.hover ?? null}
        onTileClick={onTileClick}
        onSetClick={onSetClick}
        onNewSetClick={onNewSet}
        onTileDragStart={(tileId, setIndex, e) =>
          startDrag({ kind: 'board', tileId, setIndex }, tileId, e)
        }
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
      <Hand
        tile={handTile}
        selected={isHandSelected}
        draggedTileId={drag?.tileId ?? null}
        isDropHover={drag?.hover?.kind === 'hand'}
        canAcceptDrop={
          handTile === null &&
          drag?.source.kind === 'board' &&
          drag.tileId === puzzle.hand.id
        }
        onTileClick={selectHand}
        onTileDragStart={(e) => handTile && startDrag({ kind: 'hand' }, handTile.id, e)}
      />

      {/* Drag preview */}
      {drag && draggedTile && (
        <div
          style={{
            position: 'fixed',
            left: drag.x - 22,
            top: drag.y - 29,
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'scale(1.1)',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
          }}
        >
          <Tile tile={draggedTile} selected />
        </div>
      )}
    </div>
  );
}
