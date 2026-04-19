import type { Difficulty } from '../domain/tile';

type Props = {
  onSelect: (difficulty: Difficulty) => void;
};

const DIFFICULTIES: Array<{ key: Difficulty; label: string; desc: string; dot: string }> = [
  { key: 'easy', label: 'Easy', desc: '1–2 moves', dot: 'var(--success)' },
  { key: 'medium', label: 'Medium', desc: '3–4 moves', dot: 'var(--warning)' },
  { key: 'hard', label: 'Hard', desc: '5+ moves', dot: 'var(--accent)' },
];

export default function HomeScreen({ onSelect }: Props) {
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

      {/* Difficulty buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => onSelect(d.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              background: 'var(--bg-surface)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: d.dot,
                }}
              />
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{d.label}</span>
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.desc}</span>
          </button>
        ))}
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
    </div>
  );
}
