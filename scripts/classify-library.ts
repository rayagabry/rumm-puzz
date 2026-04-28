import { readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyPuzzle } from '../src/generator/classify';
import type { Board, Difficulty, Tile } from '../src/domain/tile';

const libPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');
const lib = JSON.parse(readFileSync(libPath, 'utf8')) as Array<{
  id: string;
  board: Board;
  hand: Tile;
  minMoves: number;
  difficulty: Difficulty;
}>;

const tiers: Difficulty[] = ['hard', 'extra-hard'];

for (const tier of tiers) {
  const subset = lib.filter((p) => p.difficulty === tier);
  if (subset.length === 0) continue;
  console.log(`\n=== ${tier} (${subset.length} puzzles) ===`);
  const counts = new Map<string, number>();
  let failures = 0;
  for (const p of subset) {
    const sig = classifyPuzzle(p.board, p.hand);
    if (!sig) { failures++; continue; }
    counts.set(sig.signature, (counts.get(sig.signature) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Distinct signatures: ${sorted.length}`);
  console.log(`Classification failures: ${failures}`);
  for (const [sig, count] of sorted) {
    console.log(`  ${'#'.repeat(count).padEnd(12)} (${count})  ${sig}`);
  }
}
