type Props = {
  moves: number;
  par: number;
  onNext: () => void;
  onHome: () => void;
};

export default function WinScreen({ moves, par, onNext, onHome }: Props) {
  const rating = moves <= par ? 'Perfect!' : moves <= par + 2 ? 'Nice work!' : 'Solved!';
  const ratingColor =
    moves <= par ? 'var(--success)' : moves <= par + 2 ? 'var(--tile-yellow)' : 'var(--text)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 24,
        padding: 24,
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }}>&#127942;</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: ratingColor }}>{rating}</h1>

      <div
        style={{
          display: 'flex',
          gap: 32,
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: '20px 32px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{moves}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Your moves
          </div>
        </div>
        <div
          style={{
            width: 1,
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-muted)' }}>{par}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Par
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className="btn-secondary" onClick={onHome} style={{ padding: '14px 28px' }}>
          Home
        </button>
        <button className="btn-primary" onClick={onNext} style={{ padding: '14px 28px' }}>
          Next puzzle
        </button>
      </div>
    </div>
  );
}
