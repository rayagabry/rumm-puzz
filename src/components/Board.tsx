import { useRef, useEffect } from 'react';
import type { Board as BoardType } from '../domain/tile';
import SetRow from './SetRow';

type Props = {
  board: BoardType;
  selectedTileId: string | null;
  draggedTileId?: string | null;
  dragActive?: boolean;
  dropHover?: { kind: 'set'; index: number } | { kind: 'new-set' } | { kind: 'hand' } | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  onNewSetClick: () => void;
  onTileDragStart?: (tileId: string, setIndex: number, e: PointerEvent) => void;
};

export default function Board({
  board,
  selectedTileId,
  draggedTileId,
  dragActive,
  dropHover,
  onTileClick,
  onSetClick,
  onNewSetClick,
  onTileDragStart,
}: Props) {
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
  }, [board.length, selectedTileId, dragActive]);

  const showNewSet = Boolean(selectedTileId) || Boolean(dragActive);
  const newSetHover = dropHover?.kind === 'new-set';

  return (
    <div ref={outerRef} style={{ flex: 1, overflow: 'hidden' }}>
      <div
        ref={innerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 12,
        }}
      >
        {board.map((set, i) => (
          <SetRow
            key={i}
            tiles={set}
            setIndex={i}
            selectedTileId={selectedTileId}
            draggedTileId={draggedTileId}
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
              padding: '12px 10px',
              borderRadius: 10,
              border: '2px dashed var(--success)',
              background: newSetHover
                ? 'rgba(78, 204, 163, 0.22)'
                : 'rgba(78, 204, 163, 0.08)',
              minHeight: 74,
              cursor: 'pointer',
              color: 'var(--success)',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            + New set
          </div>
        )}
      </div>
    </div>
  );
}
