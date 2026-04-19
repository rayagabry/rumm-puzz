import type { TileSet } from '../domain/tile';
import { isValidSet } from '../domain/set';
import { sortSetForDisplay } from '../domain/set';
import Tile from './Tile';

type Props = {
  tiles: TileSet;
  setIndex: number;
  selectedTileId: string | null;
  draggedTileId?: string | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  onTileDragStart?: (tileId: string, setIndex: number, e: PointerEvent) => void;
  isDropHover?: boolean;
  highlight?: boolean;
};

export default function SetRow({
  tiles,
  setIndex,
  selectedTileId,
  draggedTileId,
  onTileClick,
  onSetClick,
  onTileDragStart,
  isDropHover,
  highlight,
}: Props) {
  const valid = isValidSet(tiles);
  const sorted = tiles.length > 0 ? sortSetForDisplay(tiles) : tiles;

  return (
    <div
      data-drop-kind="set"
      data-drop-index={setIndex}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSetClick(setIndex);
        }
      }}
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 10,
        background: isDropHover
          ? 'rgba(78, 204, 163, 0.22)'
          : highlight
            ? 'rgba(78, 204, 163, 0.15)'
            : valid
              ? 'var(--set-bg)'
              : 'var(--set-invalid)',
        border: `1px solid ${
          isDropHover
            ? 'var(--success)'
            : highlight
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
          ghost={tile.id === draggedTileId}
          onClick={() => onTileClick(tile.id, setIndex)}
          onDragStart={
            onTileDragStart ? (e) => onTileDragStart(tile.id, setIndex, e) : undefined
          }
        />
      ))}
    </div>
  );
}
