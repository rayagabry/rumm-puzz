import type { Tile as TileType } from '../domain/tile';
import type { CSSProperties } from 'react';

const COLOR_MAP: Record<TileType['color'], string> = {
  red: 'var(--tile-red)',
  blue: 'var(--tile-blue)',
  yellow: 'var(--tile-yellow)',
  black: 'var(--tile-black)',
};

type Props = {
  tile: TileType;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

export default function Tile({ tile, selected, dimmed, onClick, style }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 58,
        background: dimmed ? '#d4d0c4' : 'var(--tile-face)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--tile-border)'}`,
        borderBottom: `3px solid ${selected ? 'var(--accent)' : 'var(--tile-shadow)'}`,
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        fontWeight: 800,
        fontSize: 22,
        color: COLOR_MAP[tile.color],
        userSelect: 'none',
        opacity: dimmed ? 0.5 : 1,
        boxShadow: selected
          ? '0 0 0 2px var(--accent), 0 2px 8px rgba(233,69,96,0.3)'
          : '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.15s, opacity 0.15s, border-color 0.15s',
        flexShrink: 0,
        ...style,
      }}
    >
      {tile.number}
    </div>
  );
}
