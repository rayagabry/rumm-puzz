type Props = {
  moves: number;
  par: number;
  onNext: () => void;
  onHome: () => void;
};

export default function WinScreen({ moves, par, onNext, onHome }: Props) {
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
      <div style={{ fontSize: 56, lineHeight: 1 }}>&#127942;</div>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn-secondary" onClick={onHome} style={{ padding: '14px 26px' }}>
          Home
        </button>
        <button className="btn-primary" onClick={onNext} style={{ padding: '14px 26px' }}>
          Next puzzle
        </button>
      </div>
    </div>
  );
}
