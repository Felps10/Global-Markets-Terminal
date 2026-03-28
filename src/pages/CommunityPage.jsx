import { useNavigate } from 'react-router-dom';

const PLATFORMS = [
  { name: 'Discord',     desc: 'Join the server · coming soon' },
  { name: 'Telegram',    desc: 'Join the channel · coming soon' },
  { name: 'Twitter / X', desc: 'Follow us · coming soon' },
];

export default function CommunityPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: 'rgba(255,255,255,0.92)',
      padding: '120px 40px 80px',
      maxWidth: 720,
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(32px, 5vw, 52px)',
          color: 'rgba(255,255,255,0.92)',
          marginBottom: 12,
          marginTop: 0,
        }}>
          GMT Community
        </h1>
        <p style={{
          fontSize: 17,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 8,
          marginTop: 0,
        }}>
          Connect with investors using GMT
        </p>
        <p style={{
          fontSize: 14,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.35)',
          marginTop: 0,
          lineHeight: 1.6,
          maxWidth: 500,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          We're building a space for GMT members to share ideas,
          discuss markets, and learn together. Coming soon.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 48,
      }}>
        {PLATFORMS.map(p => (
          <div key={p.name} style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {p.name}
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.35)',
              lineHeight: 1.5,
            }}>
              {p.desc}
            </div>
            <button
              disabled
              style={{
                marginTop: 'auto',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.25)',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                cursor: 'not-allowed',
              }}
            >
              Coming soon
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
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
    </div>
  );
}
