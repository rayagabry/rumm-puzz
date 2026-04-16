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
        // Only trigger if clicking the container, not a tile
        if (e.target === e.currentTarget) {
          onSetClick(setIndex);
        }
      }}
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 10,
        background: highlight
          ? 'rgba(78, 204, 163, 0.15)'
          : valid
            ? 'var(--set-bg)'
            : 'var(--set-invalid)',
        border: `1px solid ${
          highlight
            ? 'var(--success)'
            : valid
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(233,69,96,0.3)'
        }`,
        minHeight: 74,
        minWidth: 60,
        alignItems: 'center',
        transition: 'background 0.2s, border-color 0.2s',
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
