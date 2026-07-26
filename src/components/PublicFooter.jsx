import { useNavigate } from 'react-router-dom';

// Mirrors the header nav — footer and header must agree on the sitemap.
const NAV_LINKS = [
  { label: 'Terminal Pro', path: '/terminal' },
  { label: 'Live Demo',    path: '/mini' },
  { label: 'Coverage',     path: '/coverage' },
  { label: 'Pricing',      path: '/pricing' },
];

export default function PublicFooter() {
  const navigate = useNavigate();

  return (
    <footer style={{
      background: '#04080f',
      padding: '40px 80px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 24,
    }}>
      {/* Left — brand */}
      <div>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.3)',
        }}>
          GMT
        </div>
        <span style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 9,
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.15)',
          textTransform: 'uppercase',
          display: 'block',
          marginTop: 4,
        }}>
          GLOBAL MARKETS TERMINAL
        </span>
      </div>

      {/* Center — nav links */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {NAV_LINKS.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11,
              color: 'rgba(255,255,255,0.2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 12px',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Right — copyright + disclaimer */}
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 11,
        color: 'rgba(255,255,255,0.15)',
        textAlign: 'right',
      }}>
        <div>© {new Date().getFullYear()} Global Markets Terminal</div>
        <div style={{ fontSize: 10, marginTop: 4 }}>
          For informational purposes only · Not investment advice
        </div>
      </div>
    </footer>
  );
}
