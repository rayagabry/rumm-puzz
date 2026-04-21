type Props = {
  puzzleId: string;
  moves: number;
  par: number;
  exhausted: boolean;
  onNext: () => void;
  onHome: () => void;
};

export default function WinScreen({ puzzleId, moves, par, exhausted, onNext, onHome }: Props) {
  const rating = moves <= par ? 'Perfect!' : moves <= par + 2 ? 'Nice work!' : 'Solved!';
  const ratingColor =
    moves <= par ? 'var(--success)' : moves <= par + 2 ? 'var(--warning)' : 'var(--text)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 28,
        padding: 28,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: 64,
          height: 84,
          background: 'var(--tile-face)',
          border: '1px solid var(--tile-border)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(20,24,40,0.06), 0 1px 1px rgba(20,24,40,0.04)',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: ratingColor,
          letterSpacing: '-0.02em',
        }}
      >
        {rating}
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 40,
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '22px 36px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{moves}</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            Your moves
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '-0.02em' }}>
            {par}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            Par
          </div>
        </div>
      </div>

      {exhausted && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 280,
            marginTop: -8,
          }}
        >
          That was the last puzzle at this difficulty. Reset history from the home screen to play them again.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn-secondary" onClick={onHome} style={{ padding: '14px 26px' }}>
          Home
        </button>
        {!exhausted && (
          <button className="btn-primary" onClick={onNext} style={{ padding: '14px 26px' }}>
            Next puzzle
          </button>
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          opacity: 0.6,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '0.05em',
          marginTop: 'auto',
        }}
      >
        #{puzzleId}
      </div>
    </div>
  );
}
