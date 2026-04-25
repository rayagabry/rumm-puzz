import type { Board, Tile } from '../domain/tile';
import { classifySet } from '../domain/set';
import { HAND_SOURCE, computeOptimalSolution } from '../solver/difficulty';
import type { SolutionWitness } from '../solver/difficulty';

export type SourceKind = 'run' | 'group' | 'hand';
export type DestKind = 'run' | 'group' | 'new-run' | 'new-group';
export type MoveTag = `${SourceKind}->${DestKind}`;
export type StructureTag = 'split' | 'merge' | 'dissolve' | 'new-set';

export type TechniqueSignature = {
  moveTags: MoveTag[];
  structureTags: StructureTag[];
  signature: string;
};

function destKind(
  dest: number,
  sigma: number[],
  solution: Board,
): DestKind {
  const kind = classifySet(solution[dest]);
  const hasPreimage = sigma.some((d) => d === dest);
  const base: 'run' | 'group' = kind === 'invalid' ? 'run' : kind;
  return hasPreimage ? base : (`new-${base}` as DestKind);
}

function sourceKind(
  source: number,
  originalBoard: Board,
): SourceKind {
  if (source === HAND_SOURCE) return 'hand';
  const kind = classifySet(originalBoard[source]);
  return kind === 'invalid' ? 'run' : kind;
}

/**
 * Classify the techniques required by the optimal solution.
 *
 * Move tags describe each individual (source-set, dest-set) transfer by the
 * kind of set on each end. Structure tags describe coarser properties of the
 * transformation as a whole. The `signature` is the sorted canonical
 * concatenation used as a bucket key for library diversity quotas.
 */
export function classifyWitness(
  originalBoard: Board,
  witness: SolutionWitness,
): TechniqueSignature {
  const { solution, sigma, pairs } = witness;

  const moveTags: MoveTag[] = pairs.map((p) => {
    const s = sourceKind(p.source, originalBoard);
    const d = destKind(p.dest, sigma, solution);
    return `${s}->${d}` as MoveTag;
  });

  const structureTags = new Set<StructureTag>();

  // split: a single source contributes to >=2 destinations (including σ[s] if it stays)
  const destsBySource = new Map<number, Set<number>>();
  for (const p of pairs) {
    if (p.source === HAND_SOURCE) continue;
    if (!destsBySource.has(p.source)) destsBySource.set(p.source, new Set());
    destsBySource.get(p.source)!.add(p.dest);
  }
  for (let i = 0; i < originalBoard.length; i++) {
    const ds = destsBySource.get(i) ?? new Set();
    const allDests = new Set(ds);
    if (sigma[i] !== -1) allDests.add(sigma[i]);
    if (allDests.size >= 2) structureTags.add('split');
  }

  // merge: a single dest receives tiles from >=2 distinct non-hand sources
  // (counts both transfer sources and the matched preimage if any)
  const sourcesByDest = new Map<number, Set<number>>();
  for (const p of pairs) {
    if (p.source === HAND_SOURCE) continue;
    if (!sourcesByDest.has(p.dest)) sourcesByDest.set(p.dest, new Set());
    sourcesByDest.get(p.dest)!.add(p.source);
  }
  for (let j = 0; j < solution.length; j++) {
    const ss = new Set(sourcesByDest.get(j) ?? new Set());
    const preimage = sigma.findIndex((d) => d === j);
    if (preimage !== -1) ss.add(preimage);
    if (ss.size >= 2) structureTags.add('merge');
  }

  // dissolve: a source has no matched destination (σ[i] === -1)
  for (let i = 0; i < originalBoard.length; i++) {
    if (sigma[i] === -1) {
      structureTags.add('dissolve');
      break;
    }
  }

  // new-set: a destination has no preimage
  for (let j = 0; j < solution.length; j++) {
    if (!sigma.includes(j)) {
      structureTags.add('new-set');
      break;
    }
  }

  const sortedMoveTags = [...moveTags].sort();
  const sortedStructureTags = [...structureTags].sort();
  const signature = `${sortedMoveTags.join(',')}|${sortedStructureTags.join(',')}`;

  return {
    moveTags: sortedMoveTags,
    structureTags: sortedStructureTags,
    signature,
  };
}

/**
 * Diversity quota tracker. Caps how many puzzles may share the same
 * technique signature, and can relax the cap on demand if the generator
 * can't satisfy the constraint — each relaxation is a diagnostic signal
 * that the generator has trouble producing variety in some direction.
 */
export class TechniqueQuota {
  private counts = new Map<string, number>();
  private relaxations: number[] = [];

  constructor(private cap: number) {}

  tryAccept(sig: string): boolean {
    const c = this.counts.get(sig) ?? 0;
    if (c >= this.cap) return false;
    this.counts.set(sig, c + 1);
    return true;
  }

  relax(): void {
    this.cap++;
    this.relaxations.push(this.cap);
  }

  currentCap(): number {
    return this.cap;
  }

  relaxationHistory(): number[] {
    return [...this.relaxations];
  }

  histogram(): Array<{ signature: string; count: number }> {
    return [...this.counts.entries()]
      .map(([signature, count]) => ({ signature, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Convenience: compute witness + classification in one call.
 * Returns null if no solution can be found within the budget.
 */
export function classifyPuzzle(
  board: Board,
  hand: Tile,
  maxPartitions = 2000,
  maxMs = 5000,
): TechniqueSignature | null {
  const witness = computeOptimalSolution(board, hand, maxPartitions, maxMs);
  if (!witness) return null;
  return classifyWitness(board, witness);
}
