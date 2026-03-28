import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: 'rgba(255,255,255,0.92)',
      padding: '120px 40px 80px',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: 'clamp(32px, 5vw, 52px)',
        color: 'rgba(255,255,255,0.92)',
        marginBottom: 16,
        marginTop: 0,
      }}>
        About Global Markets Terminal
      </h1>
      <p style={{
        fontSize: 16,
        fontWeight: 300,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 40,
        marginTop: 0,
      }}>
        Our story and mission — coming soon.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          padding: '10px 24px',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
      >
        ← Back
      </button>
    </div>
  );
}
