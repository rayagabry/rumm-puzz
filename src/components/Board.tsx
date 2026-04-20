import { useRef, useEffect } from 'react';
import type { Board as BoardType } from '../domain/tile';
import SetRow from './SetRow';

type Props = {
  board: BoardType;
  selectedTileIds: Set<string>;
  draggedTileIds?: Set<string> | null;
  dragActive?: boolean;
  dropHover?: { kind: 'set'; index: number } | { kind: 'new-set' } | { kind: 'hand' } | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  onNewSetClick: () => void;
  onTileDragStart?: (tileId: string, setIndex: number, e: PointerEvent) => void;
};

export default function Board({
  board,
  selectedTileIds,
  draggedTileIds,
  dragActive,
  dropHover,
  onTileClick,
  onSetClick,
  onNewSetClick,
  onTileDragStart,
}: Props) {
  const hasSelection = selectedTileIds.size > 0;
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    inner.style.zoom = '1';
    const available = outer.clientHeight;
    const natural = inner.scrollHeight;

    if (natural > available && available > 0) {
      inner.style.zoom = String(available / natural);
    }
  }, [board.length, hasSelection, dragActive]);

  const showNewSet = hasSelection || Boolean(dragActive);
  const newSetHover = dropHover?.kind === 'new-set';

  return (
    <div ref={outerRef} style={{ flex: 1, overflow: 'hidden' }}>
      <div
        ref={innerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 16,
        }}
      >
        {board.map((set, i) => (
          <SetRow
            key={i}
            tiles={set}
            setIndex={i}
            selectedTileIds={selectedTileIds}
            draggedTileIds={draggedTileIds}
            onTileClick={onTileClick}
            onSetClick={onSetClick}
            onTileDragStart={onTileDragStart}
            isDropHover={dropHover?.kind === 'set' && dropHover.index === i}
          />
        ))}

        {showNewSet && (
          <div
            data-drop-kind="new-set"
            onClick={onNewSetClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 10px',
              borderRadius: 14,
              border: '1.5px dashed var(--drop)',
              background: newSetHover
                ? 'var(--drop-soft-strong)'
                : 'var(--drop-soft)',
              minHeight: 78,
              cursor: 'pointer',
              color: 'var(--drop)',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            + New set
          </div>
        )}
      </div>
    </div>
  );
}
