import { useState } from 'react';
import {
  isLibraryExhausted,
  playedCount,
  resetPlayHistory,
  totalPuzzles,
} from '../state/usePuzzle';

type Props = {
  onStart: () => void;
};

export default function HomeScreen({ onStart }: Props) {
  // Bumped on reset so the row re-reads from localStorage.
  const [version, setVersion] = useState(0);

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
      <button
        onClick={() => {
          if (exhausted) return;
          onStart();
        }}
        disabled={exhausted}
        aria-disabled={exhausted}
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

        {exhausted && (
          <span
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
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                resetPlayHistory();
                setVersion((v) => v + 1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  resetPlayHistory();
                  setVersion((v) => v + 1);
                }
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
            </span>
          </span>
        )}
      </button>

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
    </div>
  );
}
