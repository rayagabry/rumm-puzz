# Rumikube Puzzle

Rummikub tile rearrangement puzzle PWA. Given a board of valid sets and one tile in hand, rearrange the board so all sets remain valid and the hand tile is placed.

## Stack

React 18 + TypeScript + Vite + vite-plugin-pwa. Tests via Vitest.

## Structure

- `src/domain/` — Tile/Set/Board types and validation (`tile.ts`, `set.ts`, `board.ts`)
- `src/solver/partition.ts` — Backtracking partition solver (can tiles be split into valid runs/groups?)
- `src/solver/difficulty.ts` — Min-moves scorer: counts distinct (source-set, dest-set) transfers under the max-stay matching. Also exports `computeOptimalSolution` which returns the witnessing solution partition + σ matching + move-pair set (used by the classifier).
- `src/generator/generate.ts` — Reverse-construction puzzle generator (guarantees solvability)
- `src/generator/classify.ts` — Technique classifier. Tags each puzzle's optimal solution by per-move source/dest kinds (`run`, `group`, `hand`, `new-run`, `new-group`) plus structural tags (`split`, `merge`, `dissolve`, `new-set`). Produces a canonical `signature` string used as a diversity bucket key.
- `src/puzzles/library.json` — 110 pre-generated puzzles (30 easy, 30 medium, 50 hard)
- `src/state/usePuzzle.ts` — React game state hook. Played history lives in localStorage under `rumikube:played`, gated by `LIBRARY_VERSION` (`rumikube:libVersion`) — bump the constant when puzzle IDs are reused for new content so stale history clears on next load.
- `src/components/` — Tile, SetRow, Board, Hand, PuzzleScreen
- `src/screens/` — HomeScreen, WinScreen
- `scripts/generate-puzzles.ts` — Full library generation (easy + medium + hard)
- `scripts/regenerate-hard-balanced.ts` — Keeps existing easy/medium, regenerates hard with `maxStartingSetSize=4`. Enumerates all valid starting partitions for each (solution, hand) source, classifies each, then greedy-picks the variant with the rarest technique signature so far. Yielded 40 distinct signatures across 50 hard puzzles, top-share 4%. Slow: pool build ~11min for 120 sources at MAX_VARIANTS=24.
- `scripts/classify-library.ts` — Diagnostic: prints the technique-signature histogram for a difficulty (e.g. `npx tsx scripts/classify-library.ts hard`). Useful for spotting when the generator clusters puzzles into a few patterns.

## Commands

- `npm run dev` — Dev server
- `npm run test` — 45 unit tests
- `npm run build` — Production PWA build
- `npm run gen-puzzles` — Regenerate `src/puzzles/library.json`. Run this after changing difficulty logic or ranges — library.json is derived data and its minMoves values go stale.

## Rules (no jokers)

- **Run:** 3+ same-color consecutive numbers
- **Group:** 3–4 same-number distinct-color tiles
- Tiles: 1–13 in red/blue/yellow/black, 2 copies each

## Difficulty

Measured by minimum *batched* moves — one move = one batch of tiles taken from a single source set (or the hand) and placed into a single destination set. Multiple tiles crossing the same (source, destination) pair count once. Ranges: Easy (1–2), Medium (3–4), Hard (5–8).

Overlap uses tile type, not ID. setOverlap in difficulty.ts compares by (color, number), not t.id — the partition solver assigns duplicate copies arbitrarily, so ID-based comparison inflates move counts.

### Generation gotchas

- **Partition enumeration order matters.** `findAllPartitions` enumerates runs longest-first. The partition budget (maxPartitions) caps exploration, and the true min-moves partition is usually the one that keeps long runs intact — shortest-first would exhaust the budget on "split every run" subtrees and miss the trivial solution, producing puzzles rated hard but solvable in 1.
- **Generator post-verifies.** `generatePuzzle` runs `computeMinMoves` twice: a fast check (100 partitions / 500ms) to filter, then a slow confirm (2000 partitions / 5000ms) to catch hidden shorter solutions before shipping. Shipped `minMoves` comes from the verification pass.
- **Budgets are threaded through.** `findAllPartitions` (maxNodes), `findMaxStayMatching` (deadline), and `countMoves` (deadline) all bail on time/node limits. Without this the 8×8 matching blows up (~43M nodes).
- **Parallel-runs filter.** `hasParallelRuns` rejects boards with 3+ same-range runs across different colors (e.g. red/blue/black 11-12-13) — the regroup-by-number solution is too obvious.
- **Optional max set size.** `generatePuzzle` accepts `maxStartingSetSize` to cap tiles per set on the starting board (current hard library uses 4 — keeps boards visually compact on mobile). Filter is post-partition, so tighter caps lower yield.
- **Random partition pick for diversity.** `makeStartingBoard` enumerates up to 32 valid partitions via `findAllPartitions` and picks one at random, instead of always taking the first. Picking the first biases the library hard toward the same shape — a single signature ate ~34% of hard puzzles. Random selection roughly doubled distinct-signature count (15 → 23 across the hard library).
- **Balanced selection beats random pick.** `generatePuzzleVariants` returns every valid (starting-board, signature) pair for one source. `regenerate-hard-balanced.ts` builds a pool of sources, then greedy-picks rarest-signature variants for the final library — pushed distinct signatures 23 → 40 and top share 28% → 4% on the hard set. Slow-verify is deferred until *after* selection (verifying every variant during pool build is intractable). Some selected variants get rejected at slow-verify when a hidden shorter solution surfaces; keep the pool ≥4× target to absorb that.
- **Reverse-move construction was tried and abandoned.** Building the starting board by extracting a tile from the solution and applying typed "reverse moves" (split a run, dissolve a group, etc.) consistently produced 1-move-trivial puzzles: the solver finds a partition that just slots the hand into the gap left by extraction, ignoring the scrambles. Repartition-from-tile-pool is the right model — it also matches how Rummikub actually plays (rearrange existing valid sets to absorb a tile).

## Deploy

GitHub Pages via `.github/workflows/deploy.yml`. Base path: `/rumikube-puzzle/`.
