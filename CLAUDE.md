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
- `src/puzzles/library.json` — Pre-generated puzzles. Each entry is tagged with `difficulty: 'hard' | 'extra-hard'` (5–8 vs 7–11 moves). IDs are per-tier (`hard-1..N`, `extra-hard-1..M`) so the per-tier ID space stays dense and stable across appends. Grows over time via `append-puzzles`.
- `src/state/usePuzzle.ts` — React game state hook (`usePuzzle(difficulty)`). Played history lives in localStorage under `rumikube:played` as a per-tier record `{ hard: [], 'extra-hard': [] }`, gated by `LIBRARY_VERSION` (`rumikube:libVersion`) — bump when puzzle IDs are reused for new content or when the history schema changes so stale history clears on next load.
- `src/components/` — Tile, SetRow, Board, Hand, PuzzleScreen
- `src/screens/` — HomeScreen, WinScreen
- `scripts/generate-puzzles.ts` — Full library generation
- `scripts/regenerate-hard-balanced.ts` — Regenerates **only the hard tier** of the library (writes `library.json` from scratch with 50 hard puzzles; would clobber any extra-hard entries — use `append-puzzles` for incremental tier-specific work). Enumerates all valid starting partitions for each (solution, hand) source, classifies each, then greedy-picks the variant with the rarest technique signature so far. Yielded 40 distinct signatures across 50 puzzles, top-share 4%. Slow: pool build ~11min for 120 sources at MAX_VARIANTS=24.
- `scripts/append-puzzles.ts` — Appends N new puzzles to `library.json` for a chosen tier, balanced against the signatures already present **in that tier only** (cross-tier signature counts would muddy the rare-signature heuristic). New IDs continue from the existing same-tier count, so per-tier ID space stays dense. Pool size scales with N (≥4× target). Driven by `--count=N --difficulty=hard|extra-hard` (or `COUNT`/`DIFFICULTY` env). Used by the `Generate Puzzles` workflow.
- `scripts/classify-library.ts` — Diagnostic: prints the technique-signature histogram for the library, broken out per tier (`npx tsx scripts/classify-library.ts`). Useful for spotting when the generator clusters puzzles into a few patterns.

## Commands

- `npm run dev` — Dev server
- `npm run test` — Unit tests (Vitest)
- `npm run build` — Production PWA build
- `npm run gen-puzzles` — Regenerate `src/puzzles/library.json`. Run this after changing difficulty logic or ranges — library.json is derived data and its minMoves values go stale.
- `npm run append-puzzles -- --count=N --difficulty=hard|extra-hard` — Append N puzzles in the chosen tier to the library (preserves existing puzzles and their IDs; defaults to `hard` if `--difficulty` is omitted). Phased logging (`[init] [classify] [pool] [select] [verify] [summary] [write]`) with 5s heartbeats — designed to stream usefully in the GitHub Actions log.

## Rules (no jokers)

- **Run:** 3+ same-color consecutive numbers
- **Group:** 3–4 same-number distinct-color tiles
- Tiles: 1–13 in red/blue/yellow/black, 2 copies each

## Difficulty

Measured by minimum *batched* moves — one move = one batch of tiles taken from a single source set (or the hand) and placed into a single destination set. Multiple tiles crossing the same (source, destination) pair count once. Tiers: **hard** = 5–8 moves (max set size 4), **extra-hard** = 7–11 moves (max set size 5). Ranges and set caps live in `DIFFICULTY_RANGES` / `DIFFICULTY_MAX_SET_SIZE` in `src/generator/generate.ts`.

Overlap uses tile type, not ID. setOverlap in difficulty.ts compares by (color, number), not t.id — the partition solver assigns duplicate copies arbitrarily, so ID-based comparison inflates move counts.

### Generation gotchas

- **Partition enumeration order matters.** `findAllPartitions` enumerates runs longest-first. The partition budget (maxPartitions) caps exploration, and the true min-moves partition is usually the one that keeps long runs intact — shortest-first would exhaust the budget on "split every run" subtrees and miss the trivial solution, producing puzzles rated hard but solvable in 1.
- **Generator post-verifies.** `generatePuzzle` runs `computeMinMoves` twice: a fast check (100 partitions / 500ms) to filter, then a slow confirm (2000 partitions / 5000ms) to catch hidden shorter solutions before shipping. Shipped `minMoves` comes from the verification pass.
- **Budgets are threaded through.** `findAllPartitions` (maxNodes), `findMaxStayMatching` (deadline), and `countMoves` (deadline) all bail on time/node limits. Without this the 8×8 matching blows up (~43M nodes).
- **Parallel-runs filter.** `hasParallelRuns` rejects boards with 3+ same-range runs across different colors (e.g. red/blue/black 11-12-13) — the regroup-by-number solution is too obvious.
- **Per-tier max set size.** `generatePuzzle(seed, difficulty)` defaults `maxStartingSetSize` to `DIFFICULTY_MAX_SET_SIZE[difficulty]` (hard=4, extra-hard=5). Tighter caps keep boards visually compact on mobile but lower yield; extra-hard relaxes to 5 because the 7–11 move range struggles to find boards under cap=4. Filter is post-partition.
- **Extra-hard skews to the low end of its range.** First seed pool of 25 extra-hard puzzles produced 17×7-move, 7×8-move, 1×10-move and 0×9 / 0×11. The generator's source distribution favors smaller boards, and the slow-verify step rejects anything where a shorter solution exists — so the higher end of the range needs a bigger pool to populate. Don't expect a flat histogram across 7–11; budget extra append runs if you want the upper end well-represented.
- **Random partition pick for diversity.** `makeStartingBoard` enumerates up to 32 valid partitions via `findAllPartitions` and picks one at random, instead of always taking the first. Picking the first biases the library hard toward the same shape — a single signature ate ~34% of hard puzzles. Random selection roughly doubled distinct-signature count (15 → 23 across the hard library).
- **Balanced selection beats random pick.** `generatePuzzleVariants` returns every valid (starting-board, signature) pair for one source. `regenerate-hard-balanced.ts` builds a pool of sources, then greedy-picks rarest-signature variants for the final library — pushed distinct signatures 23 → 40 and top share 28% → 4% on the hard set. Slow-verify is deferred until *after* selection (verifying every variant during pool build is intractable). Some selected variants get rejected at slow-verify when a hidden shorter solution surfaces; keep the pool ≥4× target to absorb that.
- **Reverse-move construction was tried and abandoned.** Building the starting board by extracting a tile from the solution and applying typed "reverse moves" (split a run, dissolve a group, etc.) consistently produced 1-move-trivial puzzles: the solver finds a partition that just slots the hand into the gap left by extraction, ignoring the scrambles. Repartition-from-tile-pool is the right model — it also matches how Rummikub actually plays (rearrange existing valid sets to absorb a tile).

## Deploy

GitHub Pages via `.github/workflows/deploy.yml`. Base path: `/rumikube-puzzle/`.

## Adding puzzles in production

`.github/workflows/generate-puzzles.yml` is a manual `workflow_dispatch` workflow (Actions tab → Generate Puzzles → Run workflow → enter count and pick difficulty `hard` or `extra-hard`). It runs `append-puzzles` against the chosen tier, commits the updated `src/puzzles/library.json` as `github-actions[bot]`, and pushes to `main` — which fires the deploy workflow. Uses the default `GITHUB_TOKEN` (no PAT). Logs stream live; `stdbuf -oL` ensures phase logs and heartbeats aren't block-buffered.

The home screen (`src/screens/HomeScreen.tsx`) deep-links to the workflow page and polls `api.github.com/.../runs?per_page=1` every 90s for the latest run's status (queued / running / succeeded / failed). Polling stops on terminal status to stay under GitHub's 60-req/hr unauthenticated limit. Only people with write access to the repo can actually trigger the workflow — by design. To open this up to anonymous users, you'd need an auth proxy (Cloudflare Worker / Vercel function) holding a fine-scoped PAT and exposing a dispatch endpoint.
