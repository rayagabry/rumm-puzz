import {
  generatePuzzleVariants,
  DIFFICULTY_RANGES,
  DIFFICULTY_MAX_SET_SIZE,
} from '../src/generator/generate';
import type { PuzzleCandidate } from '../src/generator/generate';
import type { Difficulty } from '../src/domain/tile';
import { computeMinMoves } from '../src/solver/difficulty';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const DIFFICULTY: Difficulty = 'hard';
const TARGET_HARD = 50;
const MAX_SET_SIZE = DIFFICULTY_MAX_SET_SIZE[DIFFICULTY];
const BASE_SEED = 1042;
const POOL_SIZE = 120;
const MAX_VARIANTS = 24;
const MAX_SOURCE_ATTEMPTS = POOL_SIZE * 8;
const [HARD_MIN, HARD_MAX] = DIFFICULTY_RANGES[DIFFICULTY];

const libPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');

console.log(`Building candidate pool of up to ${POOL_SIZE} sources...\n`);

const start = Date.now();
const sources: PuzzleCandidate[][] = [];
let seed = BASE_SEED;
let sourceAttempts = 0;

while (sources.length < POOL_SIZE && sourceAttempts < MAX_SOURCE_ATTEMPTS) {
  seed++;
  sourceAttempts++;
  const variants = generatePuzzleVariants(seed, DIFFICULTY, MAX_SET_SIZE, MAX_VARIANTS);
  if (variants.length === 0) continue;
  sources.push(variants);
  if (sources.length % 25 === 0) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`  pool ${sources.length}/${POOL_SIZE} (attempts ${sourceAttempts}, ${elapsed}s)\n`);
  }
}

const poolElapsed = ((Date.now() - start) / 1000).toFixed(1);
const totalVariants = sources.reduce((a, s) => a + s.length, 0);
console.log(`\nPool: ${sources.length} sources, ${totalVariants} total variants (${poolElapsed}s)`);
console.log(`Avg variants/source: ${(totalVariants / sources.length).toFixed(1)}\n`);

// Greedy balanced selection
const sigCounts = new Map<string, number>();
const selected: PuzzleCandidate[] = [];
const remaining = sources.map((s) => s);

let slowFailures = 0;
while (selected.length < TARGET_HARD && remaining.some((s) => s.length > 0)) {
  // Pick the (source, variant) with the rarest signature.
  let bestSourceIdx = -1;
  let bestVariantIdx = -1;
  let bestScore = Infinity;
  for (let i = 0; i < remaining.length; i++) {
    const variants = remaining[i];
    if (variants.length === 0) continue;
    for (let j = 0; j < variants.length; j++) {
      const score = sigCounts.get(variants[j].signature) ?? 0;
      if (score < bestScore) {
        bestScore = score;
        bestSourceIdx = i;
        bestVariantIdx = j;
      }
    }
  }
  if (bestSourceIdx === -1) break;

  const candidate = remaining[bestSourceIdx][bestVariantIdx];
  // Slow-verify only the picks. If the true min-moves drops below the
  // difficulty floor, skip this variant (try another from the same source).
  const verified = computeMinMoves(candidate.board, candidate.hand, 2000, 5000);
  if (verified === null || verified < HARD_MIN || verified > HARD_MAX) {
    slowFailures++;
    remaining[bestSourceIdx].splice(bestVariantIdx, 1);
    continue;
  }
  candidate.minMoves = verified;
  selected.push(candidate);
  sigCounts.set(candidate.signature, (sigCounts.get(candidate.signature) ?? 0) + 1);
  remaining[bestSourceIdx] = []; // drop the source after success
  if (selected.length % 10 === 0) {
    process.stdout.write(`  selected ${selected.length}/${TARGET_HARD} (slow-verify rejects: ${slowFailures})\n`);
  }
}
console.log(`Slow-verify rejects total: ${slowFailures}`);

console.log(`Selected ${selected.length}/${TARGET_HARD} puzzles\n`);

const hardPuzzles = selected.map((p, i) => ({
  id: `${DIFFICULTY}-${i + 1}`,
  board: p.board,
  hand: p.hand,
  minMoves: p.minMoves,
  difficulty: DIFFICULTY,
}));

const histogram: Record<number, number> = {};
for (const p of hardPuzzles) histogram[p.minMoves] = (histogram[p.minMoves] ?? 0) + 1;
console.log(`Min-moves histogram:`);
for (const [moves, count] of Object.entries(histogram).sort(([a], [b]) => +a - +b)) {
  console.log(`  ${moves} moves: ${'#'.repeat(count)} (${count})`);
}

const sigSorted = [...sigCounts.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\nSignature distribution (${sigSorted.length} distinct):`);
for (const [sig, count] of sigSorted) {
  console.log(`  ${'#'.repeat(count).padEnd(8)} (${count})  ${sig}`);
}
const top = sigSorted[0]?.[1] ?? 0;
const top3 = sigSorted.slice(0, 3).reduce((a, [, c]) => a + c, 0);
console.log(`\nTop signature share: ${((top / selected.length) * 100).toFixed(0)}%`);
console.log(`Top-3 share: ${((top3 / selected.length) * 100).toFixed(0)}%`);

writeFileSync(libPath, JSON.stringify(hardPuzzles, null, 2));
console.log(`\nWritten ${hardPuzzles.length} puzzles to ${libPath}`);
