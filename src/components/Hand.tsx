import type { Tile as TileType } from '../domain/tile';
import Tile from './Tile';

type Props = {
  tile: TileType | null;
  selected: boolean;
  onTileClick: () => void;
};

export default function Hand({ tile, selected, onTileClick }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
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
        <Tile tile={tile} selected={selected} onClick={onTileClick} />
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
