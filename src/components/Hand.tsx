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
        gap: 14,
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
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
            borderRadius: 10,
            border: '1.5px dashed var(--success)',
            background: 'var(--success-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            fontSize: 20,
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}
