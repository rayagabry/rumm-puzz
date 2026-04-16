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
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
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
            padding: '12px 10px',
            borderRadius: 10,
            border: '2px dashed var(--success)',
            background: 'rgba(78, 204, 163, 0.08)',
            minHeight: 74,
            cursor: 'pointer',
            color: 'var(--success)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + New set
        </div>
      )}
    </div>
  );
}
