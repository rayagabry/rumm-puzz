import { useEffect, useRef, useState } from 'react';
import {
  isLibraryExhausted,
  playedCount,
  resetPlayHistory,
  totalPuzzles,
} from '../state/usePuzzle';

const REPO = 'rayagabry/rumm-puzz';
const WORKFLOW_FILE = 'generate-puzzles.yml';
const WORKFLOW_PAGE = `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`;
const RUNS_API = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`;
// 90s keeps us under GitHub's 60 req/hr unauth limit even with a few
// concurrent visitors. We also stop polling once the run is terminal.
const POLL_MS = 90_000;

type WorkflowRun = {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  html_url: string;
  created_at: string;
};

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function statusLabel(run: WorkflowRun): { text: string; color: string } {
  if (run.status === 'queued') return { text: 'Queued', color: 'var(--text-muted)' };
  if (run.status === 'in_progress') return { text: 'Running…', color: 'var(--accent)' };
  if (run.status !== 'completed') return { text: run.status, color: 'var(--text-muted)' };
  switch (run.conclusion) {
    case 'success': return { text: 'Succeeded', color: 'var(--accent)' };
    case 'failure': return { text: 'Failed', color: '#c0392b' };
    case 'cancelled': return { text: 'Cancelled', color: 'var(--text-muted)' };
    default: return { text: run.conclusion ?? 'Done', color: 'var(--text-muted)' };
  }
}

function useLatestRun() {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(RUNS_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) {
          // 404 = workflow file not yet on default branch; 403 = rate-limited.
          if (!cancelled) setLoaded(true);
          return;
        }
        const data = await res.json();
        const r: WorkflowRun | undefined = data.workflow_runs?.[0];
        if (cancelled) return;
        setRun(r ?? null);
        setLoaded(true);
        if (r && r.status !== 'completed') {
          timer.current = setTimeout(tick, POLL_MS);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { run, loaded };
}

type Props = {
  onStart: () => void;
};

export default function HomeScreen({ onStart }: Props) {
  // Bumped on reset so the row re-reads from localStorage.
  const [version, setVersion] = useState(0);
  const { run, loaded } = useLatestRun();

  const total = totalPuzzles();
  const played = playedCount();
  const exhausted = isLibraryExhausted();
  const pct = total === 0 ? 0 : Math.round((played / total) * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 36,
        padding: 28,
        maxWidth: 420,
        margin: '0 auto',
      }}
      key={version}
    >
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            marginBottom: 10,
          }}
        >
          Rumikube
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, letterSpacing: '-0.01em' }}>
          Place the tile. Rearrange the board.
        </p>
      </div>

      {/* Play button */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 10,
          padding: '16px 20px 14px',
          background: 'var(--bg-surface)',
          borderRadius: 16,
          border: exhausted
            ? '1px dashed var(--border-strong)'
            : '1px solid var(--border)',
          boxShadow: exhausted ? 'none' : 'var(--shadow-sm)',
          width: '100%',
          textAlign: 'left',
          cursor: exhausted ? 'default' : 'pointer',
          opacity: exhausted ? 0.78 : 1,
        }}
        onClick={() => {
          if (exhausted) return;
          onStart();
        }}
        role="button"
        aria-disabled={exhausted}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                opacity: exhausted ? 0.5 : 1,
              }}
            />
            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
              Play
            </span>
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {exhausted ? 'All played' : '5–8 moves'}
          </span>
        </span>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 20,
          }}
        >
          <span
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: 'var(--border)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${pct}%`,
                background: 'var(--accent)',
                opacity: exhausted ? 0.55 : 0.9,
                transition: 'width 200ms ease',
              }}
            />
          </span>
          <span
            style={{
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-muted)',
              fontWeight: 500,
              minWidth: 38,
              textAlign: 'right',
            }}
          >
            {played}/{total}
          </span>
        </span>

        {/* Exhausted callout */}
        {exhausted && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 4,
              paddingLeft: 20,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              You've solved every puzzle.
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetPlayHistory();
                setVersion((v) => v + 1);
              }}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'var(--accent-soft)',
                padding: '6px 10px',
                borderRadius: 999,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reset history
            </button>
          </div>
        )}
      </div>

      {/* How to play */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '18px 20px',
          width: '100%',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h3
          style={{
            fontSize: 11,
            marginBottom: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          How to play
        </h3>
        <ol
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: 'var(--text)',
            paddingLeft: 18,
          }}
        >
          <li>You have one tile in your hand</li>
          <li>Rearrange the board tiles and place your tile</li>
          <li>Every set must be a valid run or group</li>
          <li>
            <strong style={{ fontWeight: 600 }}>Run:</strong> 3+ same-color tiles in sequence
          </li>
          <li>
            <strong style={{ fontWeight: 600 }}>Group:</strong> 3–4 same-number tiles, different colors
          </li>
        </ol>
      </div>

      {/* Generate more puzzles */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '14px 16px',
          width: '100%',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <a
          href={WORKFLOW_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            textDecoration: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Generate more puzzles</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>↗</span>
        </a>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          Opens GitHub Actions. Click <strong style={{ fontWeight: 600 }}>Run workflow</strong>,
          set how many to add, then watch the live log. New puzzles ship after the deploy
          workflow finishes.
        </p>
        {loaded && run && (
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusLabel(run).color,
                opacity: run.status === 'completed' ? 1 : 0.7,
              }}
            />
            <span style={{ color: statusLabel(run).color, fontWeight: 600 }}>
              {statusLabel(run).text}
            </span>
            <span>·</span>
            <span>last run {fmtAgo(run.created_at)}</span>
          </a>
        )}
        {loaded && !run && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No runs yet.</span>
        )}
      </div>
    </div>
  );
}
