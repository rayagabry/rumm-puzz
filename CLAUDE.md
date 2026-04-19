# Rumikube Puzzle

Rummikub tile rearrangement puzzle PWA. Given a board of valid sets and one tile in hand, rearrange the board so all sets remain valid and the hand tile is placed.

## Stack

React 18 + TypeScript + Vite + vite-plugin-pwa. Tests via Vitest.

## Structure

- `src/domain/` — Tile/Set/Board types and validation (`tile.ts`, `set.ts`, `board.ts`)
- `src/solver/partition.ts` — Backtracking partition solver (can tiles be split into valid runs/groups?)
- `src/solver/difficulty.ts` — Min-moves scorer: counts distinct (source-set, dest-set) transfers under the max-stay matching
- `src/generator/generate.ts` — Reverse-construction puzzle generator (guarantees solvability)
- `src/puzzles/library.json` — 90 pre-generated puzzles (30 easy/medium/hard)
- `src/state/usePuzzle.ts` — React game state hook
- `src/components/` — Tile, SetRow, Board, Hand, PuzzleScreen
- `src/screens/` — HomeScreen, WinScreen
- `scripts/generate-puzzles.ts` — Offline puzzle generation script

## Commands

- `npm run dev` — Dev server
- `npm run test` — 37 unit tests
- `npm run build` — Production PWA build
- `npm run gen-puzzles` — Regenerate `src/puzzles/library.json`. Run this after changing difficulty logic or ranges — library.json is derived data and its minMoves values go stale.

## Rules (no jokers)

- **Run:** 3+ same-color consecutive numbers
- **Group:** 3–4 same-number distinct-color tiles
- Tiles: 1–13 in red/blue/yellow/black, 2 copies each

## Difficulty

Measured by minimum *batched* moves — one move = one batch of tiles taken from a single source set (or the hand) and placed into a single destination set. Multiple tiles crossing the same (source, destination) pair count once. Ranges: Easy (1–2), Medium (3–4), Hard (5+).

Overlap uses tile type, not ID. setOverlap in difficulty.ts compares by (color, number), not t.id — the partition solver assigns duplicate copies arbitrarily, so ID-based comparison inflates move counts.

## Deploy

GitHub Pages via `.github/workflows/deploy.yml`. Base path: `/rumikube-puzzle/`.
