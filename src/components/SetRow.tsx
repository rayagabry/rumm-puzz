import type { TileSet } from '../domain/tile';
import { isValidSet } from '../domain/set';
import { sortSetForDisplay } from '../domain/set';
import Tile from './Tile';

type Props = {
  tiles: TileSet;
  setIndex: number;
  selectedTileId: string | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  highlight?: boolean;
};

export default function SetRow({
  tiles,
  setIndex,
  selectedTileId,
  onTileClick,
  onSetClick,
  highlight,
}: Props) {
  const valid = isValidSet(tiles);
  const sorted = tiles.length > 0 ? sortSetForDisplay(tiles) : tiles;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSetClick(setIndex);
        }
      }}
      style={{
        display: 'flex',
        gap: 6,
        padding: '10px 12px',
        borderRadius: 14,
        background: highlight
          ? 'var(--success-soft)'
          : valid
            ? 'var(--set-bg)'
            : 'var(--set-invalid)',
        border: `1px solid ${
          highlight
            ? 'var(--success)'
            : valid
              ? 'transparent'
              : 'var(--set-invalid-border)'
        }`,
        minHeight: 78,
        minWidth: 60,
        alignItems: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        cursor: selectedTileId ? 'pointer' : 'default',
        flexWrap: 'wrap',
      }}
    >
      {sorted.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          selected={tile.id === selectedTileId}
          onClick={() => onTileClick(tile.id, setIndex)}
        />
      ))}
    </div>
  );
}
