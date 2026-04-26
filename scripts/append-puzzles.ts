/**
 * Append N additional hard puzzles to src/puzzles/library.json, balanced
 * against the technique signatures already present.
 *
 * Designed to be run from a GitHub Actions workflow with logs streamed to
 * the Actions UI — every long phase emits a heartbeat so the log never
 * looks frozen.
 *
 * Usage:
 *   npm run append-puzzles -- --count=5
 *   COUNT=5 npm run append-puzzles
 */
import { generatePuzzleVariants } from '../src/generator/generate';
import type { PuzzleCandidate } from '../src/generator/generate';
import { classifyPuzzle } from '../src/generator/classify';
import { computeMinMoves } from '../src/solver/difficulty';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MAX_SET_SIZE = 4;
const MAX_VARIANTS = 24;
const HARD_MIN = 5;
const HARD_MAX = 8;

// Pool size scales with the number of puzzles requested. Empirically each
// successful pick requires ~3 sources after slow-verify rejects, so we
// build a pool ≥4× target to avoid running dry mid-selection.
const POOL_PER_TARGET = 4;
const POOL_MIN = 24;
const SOURCE_ATTEMPT_MULTIPLIER = 8;

const HEARTBEAT_MS = 5000;

function parseCount(): number {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    const m = /^--count=(\d+)$/.exec(a);
    if (m) return parseInt(m[1], 10);
  }
  if (process.env.COUNT) return parseInt(process.env.COUNT, 10);
  throw new Error('Missing --count=N (or COUNT env var)');
}

function log(phase: string, msg: string) {
  process.stdout.write(`[${phase}] ${msg}\n`);
}

function fmtSecs(ms: number) {
  return (ms / 1000).toFixed(1) + 's';
}

class Heartbeat {
  private timer: NodeJS.Timeout | null = null;
  private start = Date.now();
  constructor(private phase: string, private describe: () => string) {}
  begin() {
    this.start = Date.now();
    this.timer = setInterval(() => {
      log(this.phase, `heartbeat: ${this.describe()} (${fmtSecs(Date.now() - this.start)})`);
    }, HEARTBEAT_MS);
    this.timer.unref();
  }
  end() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

const COUNT = parseCount();
if (!Number.isFinite(COUNT) || COUNT <= 0) {
  throw new Error(`Invalid count: ${COUNT}`);
}

const libPath = resolve(import.meta.dirname ?? '.', '..', 'src', 'puzzles', 'library.json');

type StoredPuzzle = {
  id: string;
  board: PuzzleCandidate['board'];
  hand: PuzzleCandidate['hand'];
  minMoves: number;
};

log('init', `target: append ${COUNT} puzzle(s)`);
log('init', `library path: ${libPath}`);

const existing: StoredPuzzle[] = JSON.parse(readFileSync(libPath, 'utf8'));
log('init', `existing library size: ${existing.length}`);

// Seed signature counts from existing puzzles so balanced selection
// continues against the current shape of the library, not a fresh slate.
log('classify', `classifying ${existing.length} existing puzzles to seed signature counts...`);
const sigCounts = new Map<string, number>();
const classifyHb = new Heartbeat('classify', () => `${[...sigCounts.values()].reduce((a, b) => a + b, 0)}/${existing.length} done`);
classifyHb.begin();
const classifyStart = Date.now();
let classifyFailures = 0;
for (let i = 0; i < existing.length; i++) {
  const p = existing[i];
  const sig = classifyPuzzle(p.board, p.hand);
  if (sig) {
    sigCounts.set(sig.signature, (sigCounts.get(sig.signature) ?? 0) + 1);
  } else {
    classifyFailures++;
  }
}
classifyHb.end();
log('classify', `done in ${fmtSecs(Date.now() - classifyStart)} (${sigCounts.size} distinct signatures, ${classifyFailures} unclassifiable)`);

// Pool build.
const POOL_SIZE = Math.max(POOL_MIN, COUNT * POOL_PER_TARGET);
const MAX_SOURCE_ATTEMPTS = POOL_SIZE * SOURCE_ATTEMPT_MULTIPLIER;
log('pool', `building candidate pool (target ${POOL_SIZE} sources, max ${MAX_SOURCE_ATTEMPTS} seeds)...`);

// Seed offset: derive from existing library size + a constant, so successive
// runs explore fresh seeds rather than rebuilding from BASE_SEED=1042 each time.
const BASE_SEED = 1042 + existing.length * 31 + Date.now() % 1000;
log('pool', `base seed: ${BASE_SEED}`);

const sources: PuzzleCandidate[][] = [];
let seed = BASE_SEED;
let sourceAttempts = 0;
const poolStart = Date.now();
const poolHb = new Heartbeat('pool', () => `${sources.length}/${POOL_SIZE} sources, ${sourceAttempts} attempts`);
poolHb.begin();

while (sources.length < POOL_SIZE && sourceAttempts < MAX_SOURCE_ATTEMPTS) {
  seed++;
  sourceAttempts++;
  const variants = generatePuzzleVariants(seed, MAX_SET_SIZE, MAX_VARIANTS);
  if (variants.length === 0) continue;
  sources.push(variants);
  if (sources.length % Math.max(1, Math.floor(POOL_SIZE / 8)) === 0) {
    log('pool', `progress: ${sources.length}/${POOL_SIZE} sources (${sourceAttempts} attempts, ${fmtSecs(Date.now() - poolStart)})`);
  }
}
poolHb.end();

const totalVariants = sources.reduce((a, s) => a + s.length, 0);
log('pool', `done: ${sources.length} sources, ${totalVariants} total variants (avg ${(totalVariants / Math.max(1, sources.length)).toFixed(1)}/source) in ${fmtSecs(Date.now() - poolStart)}`);

if (sources.length < COUNT) {
  log('pool', `WARN: pool smaller than target — selection may fall short`);
}

// Greedy balanced selection — pick the variant with the rarest signature so
// far, slow-verify, repeat.
log('select', `greedy-picking ${COUNT} variants, slow-verifying each...`);
const selected: PuzzleCandidate[] = [];
const remaining = sources.map((s) => s);
let slowFailures = 0;
const selectStart = Date.now();
const selectHb = new Heartbeat('select', () => `${selected.length}/${COUNT} picked, ${slowFailures} verify rejects`);
selectHb.begin();

while (selected.length < COUNT && remaining.some((s) => s.length > 0)) {
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
  const verified = computeMinMoves(candidate.board, candidate.hand, 2000, 5000);
  if (verified === null || verified < HARD_MIN || verified > HARD_MAX) {
    slowFailures++;
    log('verify', `reject (verified=${verified}, sig=${candidate.signature.slice(0, 60)}...)`);
    remaining[bestSourceIdx].splice(bestVariantIdx, 1);
    continue;
  }
  candidate.minMoves = verified;
  selected.push(candidate);
  sigCounts.set(candidate.signature, (sigCounts.get(candidate.signature) ?? 0) + 1);
  remaining[bestSourceIdx] = [];
  log('select', `pick ${selected.length}/${COUNT}: ${verified} moves, sig=${candidate.signature}`);
}
selectHb.end();
log('select', `done in ${fmtSecs(Date.now() - selectStart)} (${selected.length}/${COUNT} picked, ${slowFailures} verify rejects)`);

if (selected.length === 0) {
  throw new Error('No new puzzles produced — pool exhausted before any pick passed slow-verify.');
}
if (selected.length < COUNT) {
  log('select', `WARN: only produced ${selected.length} of ${COUNT} requested`);
}

// Build the new entries with IDs continuing from the existing library.
const startIndex = existing.length;
const newPuzzles: StoredPuzzle[] = selected.map((p, i) => ({
  id: `hard-${startIndex + i + 1}`,
  board: p.board,
  hand: p.hand,
  minMoves: p.minMoves,
}));

// Summary.
log('summary', `min-moves histogram (new puzzles only):`);
const histogram: Record<number, number> = {};
for (const p of newPuzzles) histogram[p.minMoves] = (histogram[p.minMoves] ?? 0) + 1;
for (const [moves, count] of Object.entries(histogram).sort(([a], [b]) => +a - +b)) {
  log('summary', `  ${moves} moves: ${'#'.repeat(count)} (${count})`);
}
log('summary', `library signature distribution after append (top 10):`);
const sigSorted = [...sigCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [sig, count] of sigSorted.slice(0, 10)) {
  log('summary', `  ${count.toString().padStart(3)}  ${sig}`);
}
log('summary', `${sigSorted.length} distinct signatures across ${existing.length + newPuzzles.length} puzzles`);

// Write.
const merged = [...existing, ...newPuzzles];
writeFileSync(libPath, JSON.stringify(merged, null, 2));
log('write', `appended ${newPuzzles.length} puzzles → ${libPath} (${merged.length} total)`);
log('done', `success`);
