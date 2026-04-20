import { generateLibrary } from '../src/generator/generate';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const PUZZLES_PER_DIFFICULTY = 30;
const BASE_SEED = 42;

console.log(`Generating ${PUZZLES_PER_DIFFICULTY} puzzles per difficulty...\n`);
const start = Date.now();

const puzzles = generateLibrary(PUZZLES_PER_DIFFICULTY, BASE_SEED, (diff, count, attempts, puzzle) => {
  const sets = puzzle.board.length;
  const tiles = puzzle.board.flat().length;
  process.stdout.write(
    `  ${diff} ${count}/${PUZZLES_PER_DIFFICULTY} — ${puzzle.minMoves} moves, ${sets} sets, ${tiles} tiles (attempt ${attempts})\n`,
  );
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Generated ${puzzles.length} puzzles in ${elapsed}s\n`);

// Print histogram
const histogram: Record<string, Record<number, number>> = {};
for (const p of puzzles) {
  if (!histogram[p.difficulty]) histogram[p.difficulty] = {};
  histogram[p.difficulty][p.minMoves] = (histogram[p.difficulty][p.minMoves] ?? 0) + 1;
}

for (const [diff, counts] of Object.entries(histogram)) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`${diff} (${total} puzzles):`);
  for (const [moves, count] of Object.entries(counts).sort(([a], [b]) => +a - +b)) {
    console.log(`  ${moves} moves: ${'#'.repeat(count)} (${count})`);
  }
}

// Write to library.json
const outPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');
mkdirSync(dirname(outPath), { recursive: true });

// Strip solution from shipped puzzles (players shouldn't peek!)
// Keep solution in a separate field for validation
const library = puzzles.map((p) => ({
  id: p.id,
  board: p.board,
  hand: p.hand,
  minMoves: p.minMoves,
  difficulty: p.difficulty,
}));

writeFileSync(outPath, JSON.stringify(library, null, 2));
console.log(`\nWritten to ${outPath}`);
