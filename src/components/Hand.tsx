import type { Tile as TileType } from '../domain/tile';
import Tile from './Tile';

type Props = {
  tile: TileType | null;
  selected: boolean;
  draggedTileId?: string | null;
  isDropHover?: boolean;
  canAcceptDrop?: boolean;
  onTileClick: () => void;
  onTileDragStart?: (e: PointerEvent) => void;
};

export default function Hand({
  tile,
  selected,
  draggedTileId,
  isDropHover,
  canAcceptDrop,
  onTileClick,
  onTileDragStart,
}: Props) {
  return (
    <div
      data-drop-kind={canAcceptDrop ? 'hand' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        background: isDropHover ? 'rgba(78, 204, 163, 0.22)' : 'var(--bg-surface)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Your tile
      </span>
      {tile ? (
        <Tile
          tile={tile}
          selected={selected}
          ghost={tile.id === draggedTileId}
          onClick={onTileClick}
          onDragStart={onTileDragStart}
        />
      ) : (
        <div
          style={{
            width: 44,
            height: 58,
            borderRadius: 6,
            border: '2px dashed var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            fontSize: 18,
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}
