import { useEffect, useRef, useState } from 'react';
import { isBoardValid } from '../domain/set';
import { usePuzzle } from '../state/usePuzzle';
import Board from './Board';
import Hand from './Hand';
import Tile from './Tile';

import type { Difficulty } from '../domain/tile';

type Props = {
  difficulty: Difficulty;
  onWin: (moves: number, par: number, puzzleId: string) => void;
  onHome: () => void;
};

type DragSource =
  | { kind: 'hand' }
  | { kind: 'board'; tiles: { tileId: string; setIndex: number }[]; withHand?: boolean };

type DropTarget =
  | { kind: 'set'; index: number }
  | { kind: 'new-set' }
  | { kind: 'hand' };

type DragState = {
  source: DragSource;
  /** Primary tile shown in the drag preview. */
  tileId: string;
  /** All tiles visually lifted off the board during the drag. */
  tileIds: Set<string>;
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
    setFullRow,
    handTile,
    selection,
    selectedTileIds,
    moveCount,
    solved,
    canUndo,
    selectHand,
    onTileClick,
    onSetClick,
    onNewSet,
    performMove,
    checkSolution,
    reset,
    undo,
    returnToHand,
  } = usePuzzle(difficulty);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const canCheck = handTile === null && isBoardValid(workingBoard.filter((s) => s.length > 0));
  const isHandSelected = selection.hand;

  const selectedIsHandTile =
    !selection.hand &&
    selection.tiles.length === 1 &&
    selection.tiles[0].tileId === puzzle.hand.id;

  useEffect(() => {
    if (solved) onWin(moveCount, puzzle.minMoves, puzzle.id);
  }, [solved, moveCount, puzzle.minMoves, puzzle.id, onWin]);

  const draggedTile = (() => {
    if (!drag) return null;
    if (drag.source.kind === 'hand') return handTile;
    if (drag.source.withHand && handTile && drag.tileId === handTile.id) return handTile;
    for (const { tileId, setIndex } of drag.source.tiles) {
      if (tileId !== drag.tileId) continue;
      return workingBoard[setIndex]?.find((t) => t.id === tileId) ?? null;
    }
    return null;
  })();

  const multiCount =
    drag?.source.kind === 'board'
      ? drag.source.tiles.length + (drag.source.withHand ? 1 : 0)
      : 1;

  const startDrag = (source: DragSource, tileId: string, e: PointerEvent) => {
    const tileIds = new Set<string>();
    if (source.kind === 'hand') tileIds.add(tileId);
    else {
      for (const t of source.tiles) tileIds.add(t.tileId);
      if (source.withHand && handTile) tileIds.add(handTile.id);
    }

    const initial: DragState = {
      source,
      tileId,
      tileIds,
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
            Moves
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {moveCount} {puzzle.minMoves > 0 && <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>/ par {puzzle.minMoves}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-ghost"
            onClick={undo}
            disabled={!canUndo || solved}
            style={{ padding: '8px 12px', fontSize: 14, opacity: !canUndo || solved ? 0.4 : 1 }}
          >
            Undo
          </button>
          <button className="btn-ghost" onClick={reset} style={{ padding: '8px 12px', fontSize: 14 }}>
            Reset
          </button>
        </div>
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
          ? 'Drag your tile or tap tiles then a set. Tap multiple tiles to move them together.'
          : canCheck
            ? 'All sets look valid! Tap "Check" to verify.'
            : 'Keep rearranging — some sets are still invalid.'}
      </div>

      {/* Board */}
      <Board
        board={workingBoard}
        setFullRow={setFullRow}
        selectedTileIds={selectedTileIds}
        draggedTileIds={drag?.tileIds ?? null}
        dragActive={!!drag}
        dropHover={drag?.hover ?? null}
        onTileClick={onTileClick}
        onSetClick={onSetClick}
        onNewSetClick={onNewSet}
        onTileDragStart={(tileId, setIndex, e) => {
          const inSelection = selection.tiles.some((t) => t.tileId === tileId);
          const hasOtherSelection = selection.tiles.length > 0 || selection.hand;
          let tiles: { tileId: string; setIndex: number }[];
          let withHand = false;
          if (inSelection) {
            tiles = selection.tiles;
            withHand = selection.hand;
          } else if (hasOtherSelection) {
            // Drag pulls along the existing multi-selection plus this tile.
            tiles = [...selection.tiles, { tileId, setIndex }];
            withHand = selection.hand;
          } else {
            tiles = [{ tileId, setIndex }];
          }
          startDrag({ kind: 'board', tiles, withHand }, tileId, e);
        }}
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
        draggedTileId={
          drag && handTile && drag.tileIds.has(handTile.id) ? handTile.id : null
        }
        isDropHover={drag?.hover?.kind === 'hand'}
        canAcceptDrop={
          handTile === null &&
          drag?.source.kind === 'board' &&
          drag.source.tiles.length === 1 &&
          drag.source.tiles[0].tileId === puzzle.hand.id
        }
        onTileClick={selectHand}
        onTileDragStart={(e) => {
          if (!handTile) return;
          // If board tiles are already selected, dragging from hand pulls them along too.
          if (selection.tiles.length > 0) {
            startDrag(
              { kind: 'board', tiles: selection.tiles, withHand: true },
              handTile.id,
              e,
            );
          } else {
            startDrag({ kind: 'hand' }, handTile.id, e);
          }
        }}
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
          <div style={{ position: 'relative' }}>
            {multiCount > 1 && (
              <>
                <div style={{ position: 'absolute', top: 4, left: 6, opacity: 0.6 }}>
                  <Tile tile={draggedTile} />
                </div>
                <div style={{ position: 'absolute', top: 2, left: 3, opacity: 0.8 }}>
                  <Tile tile={draggedTile} />
                </div>
              </>
            )}
            <div style={{ position: 'relative' }}>
              <Tile tile={draggedTile} selected />
              {multiCount > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 10,
                    background: 'var(--accent)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {multiCount}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
