import { readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyPuzzle } from '../src/generator/classify';
import type { Board, Tile } from '../src/domain/tile';

const libPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');
const lib = JSON.parse(readFileSync(libPath, 'utf8')) as Array<{
  id: string;
  board: Board;
  hand: Tile;
  minMoves: number;
}>;

console.log(`Classifying ${lib.length} puzzles...\n`);

const counts = new Map<string, number>();
let failures = 0;
for (const p of lib) {
  const sig = classifyPuzzle(p.board, p.hand);
  if (!sig) { failures++; continue; }
  counts.set(sig.signature, (counts.get(sig.signature) ?? 0) + 1);
}

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Distinct signatures: ${sorted.length}`);
console.log(`Classification failures: ${failures}\n`);
for (const [sig, count] of sorted) {
  console.log(`  ${'#'.repeat(count).padEnd(12)} (${count})  ${sig}`);
}
