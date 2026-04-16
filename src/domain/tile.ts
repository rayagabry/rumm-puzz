export const COLORS = ['red', 'blue', 'yellow', 'black'] as const;
export type Color = (typeof COLORS)[number];

export type Tile = {
  id: string;
  color: Color;
  number: number; // 1..13
};

export type TileSet = Tile[];
export type Board = TileSet[];

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Puzzle = {
  id: string;
  board: Board;
  hand: Tile;
  solution: Board;
  minMoves: number;
  difficulty: Difficulty;
};

/** Build the full 104-tile deck (2 copies of each color/number). */
export function buildDeck(): Tile[] {
  const tiles: Tile[] = [];
  for (const color of COLORS) {
    for (let num = 1; num <= 13; num++) {
      tiles.push({ id: `${color}-${num}-a`, color, number: num });
      tiles.push({ id: `${color}-${num}-b`, color, number: num });
    }
  }
  return tiles;
}

/** Deterministic seeded RNG (xorshift32). */
export function makeRng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

/** Fisher-Yates shuffle using provided RNG. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Color sort order for canonical ordering. */
const COLOR_ORDER: Record<Color, number> = { red: 0, blue: 1, yellow: 2, black: 3 };

/** Sort tiles by (color, number) for canonical representation. */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort(
    (a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color] || a.number - b.number,
  );
}

/** Create a canonical string key for a multiset of tiles (ignoring ids). */
export function tileSetKey(tiles: Tile[]): string {
  return sortTiles(tiles)
    .map((t) => `${t.color[0]}${t.number}`)
    .join(',');
}
