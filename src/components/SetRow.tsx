import type { TileSet } from '../domain/tile';
import { isValidSet } from '../domain/set';
import { sortSetForDisplay } from '../domain/set';
import Tile from './Tile';

type Props = {
  tiles: TileSet;
  setIndex: number;
  selectedTileIds: Set<string>;
  draggedTileIds?: Set<string> | null;
  onTileClick: (tileId: string, setIndex: number) => void;
  onSetClick: (setIndex: number) => void;
  onTileDragStart?: (tileId: string, setIndex: number, e: PointerEvent) => void;
  isDropHover?: boolean;
  highlight?: boolean;
};

export default function SetRow({
  tiles,
  setIndex,
  selectedTileIds,
  draggedTileIds,
  onTileClick,
  onSetClick,
  onTileDragStart,
  isDropHover,
  highlight,
}: Props) {
  const hasSelection = selectedTileIds.size > 0;
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
        gap: 6,
        padding: '10px 12px',
        borderRadius: 14,
        background: isDropHover
          ? 'var(--drop-soft-strong)'
          : highlight
            ? 'var(--success-soft)'
            : valid
              ? 'var(--set-bg)'
              : 'var(--set-invalid)',
        border: `1px solid ${
          isDropHover
            ? 'var(--drop)'
            : highlight
              ? 'var(--success)'
              : valid
                ? 'transparent'
                : 'var(--set-invalid-border)'
        }`,
        minHeight: 78,
        minWidth: 60,
        alignItems: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        cursor: hasSelection ? 'pointer' : 'default',
        flexWrap: 'wrap',
      }}
    >
      {sorted.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          selected={selectedTileIds.has(tile.id)}
          ghost={draggedTileIds?.has(tile.id) ?? false}
          onClick={() => onTileClick(tile.id, setIndex)}
          onDragStart={
            onTileDragStart ? (e) => onTileDragStart(tile.id, setIndex, e) : undefined
          }
        />
      ))}
    </div>
  );
}
