import { generatePuzzle } from '../src/generator/generate';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const TARGET_HARD = 50;
const MAX_SET_SIZE = 4;
const BASE_SEED = 1042;

const libPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');
const existing = JSON.parse(readFileSync(libPath, 'utf8')) as Array<{
  id: string;
  board: unknown;
  hand: unknown;
  minMoves: number;
  difficulty: 'easy' | 'medium' | 'hard';
}>;

const kept = existing.filter((p) => p.difficulty !== 'hard');
console.log(`Keeping ${kept.length} non-hard puzzles, generating ${TARGET_HARD} new hard puzzles (max set size ${MAX_SET_SIZE})...\n`);

const start = Date.now();
const hardPuzzles: typeof existing = [];
let seed = BASE_SEED;
let attempts = 0;
const maxAttempts = TARGET_HARD * 50;

while (hardPuzzles.length < TARGET_HARD && attempts < maxAttempts) {
  seed++;
  attempts++;
  const p = generatePuzzle('hard', seed, MAX_SET_SIZE);
  if (!p) continue;
  const idx = hardPuzzles.length + 1;
  const sets = p.board.length;
  const tiles = p.board.flat().length;
  const maxSet = Math.max(...p.board.map((s) => s.length));
  process.stdout.write(`  hard ${idx}/${TARGET_HARD} — ${p.minMoves} moves, ${sets} sets, ${tiles} tiles, maxSet ${maxSet} (attempt ${attempts})\n`);
  hardPuzzles.push({
    id: `hard-${idx}`,
    board: p.board,
    hand: p.hand,
    minMoves: p.minMoves,
    difficulty: 'hard',
  });
}

if (hardPuzzles.length < TARGET_HARD) {
  console.warn(`Only generated ${hardPuzzles.length}/${TARGET_HARD} after ${attempts} attempts`);
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nGenerated ${hardPuzzles.length} hard puzzles in ${elapsed}s`);

const histogram: Record<number, number> = {};
for (const p of hardPuzzles) histogram[p.minMoves] = (histogram[p.minMoves] ?? 0) + 1;
console.log(`hard (${hardPuzzles.length} puzzles):`);
for (const [moves, count] of Object.entries(histogram).sort(([a], [b]) => +a - +b)) {
  console.log(`  ${moves} moves: ${'#'.repeat(count)} (${count})`);
}

const merged = [...kept, ...hardPuzzles];
writeFileSync(libPath, JSON.stringify(merged, null, 2));
console.log(`\nWritten ${merged.length} puzzles to ${libPath}`);
