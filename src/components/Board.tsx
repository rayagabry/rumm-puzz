import { useRef, useEffect } from 'react';
import type { Board as BoardType } from '../domain/tile';
import SetRow from './SetRow';

type Props = {
  board: BoardType;
  selectedTileId: string | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  onNewSetClick: () => void;
};

export default function Board({
  board,
  selectedTileId,
  onTileClick,
  onSetClick,
  onNewSetClick,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Reset zoom to measure natural height
    inner.style.zoom = '1';
    const available = outer.clientHeight;
    const natural = inner.scrollHeight;

    if (natural > available && available > 0) {
      inner.style.zoom = String(available / natural);
    }
  }, [board.length, selectedTileId]);

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
            selectedTileId={selectedTileId}
            onTileClick={onTileClick}
            onSetClick={onSetClick}
          />
        ))}

        {/* "New set" drop zone — visible when a tile is selected */}
        {selectedTileId && (
          <div
            onClick={onNewSetClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 10px',
              borderRadius: 14,
              border: '1.5px dashed var(--success)',
              background: 'var(--success-soft)',
              minHeight: 78,
              cursor: 'pointer',
              color: 'var(--success)',
              fontSize: 14,
              fontWeight: 600,
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
