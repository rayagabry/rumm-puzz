import type { Difficulty } from '../domain/tile';

type Props = {
  onSelect: (difficulty: Difficulty) => void;
};

const DIFFICULTIES: Array<{ key: Difficulty; label: string; desc: string; color: string }> = [
  { key: 'easy', label: 'Easy', desc: '1–2 moves', color: 'var(--success)' },
  { key: 'medium', label: 'Medium', desc: '3–4 moves', color: 'var(--tile-yellow)' },
  { key: 'hard', label: 'Hard', desc: '5+ moves', color: 'var(--accent)' },
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
        gap: 32,
        padding: 24,
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent), var(--tile-yellow))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}
        >
          Rumikube
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          Place the tile. Rearrange the board.
        </p>
      </div>

      {/* Difficulty buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => onSelect(d.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              background: 'var(--bg-card)',
              borderRadius: 12,
              border: `1px solid rgba(255,255,255,0.08)`,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: d.color }}>{d.label}</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{d.desc}</span>
          </button>
        ))}
      </div>

      {/* How to play */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: 16,
          width: '100%',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-muted)' }}>How to play</h3>
        <ol
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text)',
            paddingLeft: 20,
          }}
        >
          <li>You have one tile in your hand</li>
          <li>Rearrange the board tiles and place your tile</li>
          <li>Every set must be a valid run or group</li>
          <li>
            <strong>Run:</strong> 3+ same-color tiles in sequence
          </li>
          <li>
            <strong>Group:</strong> 3–4 same-number tiles, different colors
          </li>
        </ol>
      </div>
    </div>
  );
}
