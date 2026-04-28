import { generateLibrary } from '../src/generator/generate';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const TOTAL_PUZZLES = 50;
const BASE_SEED = 42;

console.log(`Generating ${TOTAL_PUZZLES} puzzles...\n`);
const start = Date.now();

const puzzles = generateLibrary(TOTAL_PUZZLES, BASE_SEED, 'hard', (count, attempts, puzzle) => {
  const sets = puzzle.board.length;
  const tiles = puzzle.board.flat().length;
  process.stdout.write(
    `  ${count}/${TOTAL_PUZZLES} — ${puzzle.minMoves} moves, ${sets} sets, ${tiles} tiles (attempt ${attempts})\n`,
  );
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Generated ${puzzles.length} puzzles in ${elapsed}s\n`);

// Print histogram
const histogram: Record<number, number> = {};
for (const p of puzzles) {
  histogram[p.minMoves] = (histogram[p.minMoves] ?? 0) + 1;
}

console.log(`Min-moves histogram:`);
for (const [moves, count] of Object.entries(histogram).sort(([a], [b]) => +a - +b)) {
  console.log(`  ${moves} moves: ${'#'.repeat(count)} (${count})`);
}

// Write to library.json
const outPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');
mkdirSync(dirname(outPath), { recursive: true });

// Strip solution from shipped puzzles (players shouldn't peek!)
const library = puzzles.map((p) => ({
  id: p.id,
  board: p.board,
  hand: p.hand,
  minMoves: p.minMoves,
  difficulty: p.difficulty,
}));

writeFileSync(outPath, JSON.stringify(library, null, 2));
console.log(`\nWritten to ${outPath}`);
