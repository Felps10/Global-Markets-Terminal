// Compact deep-link button: "Open in {label} →". Shared by the asset drawer's
// tab link row and the Chart & Research card headers. Accent styling uses the
// --c-* variables so it follows the blue Global / gold Brazil context.
import { useNavigate } from 'react-router-dom';

export default function OpenInPageButton({ label, to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: '0.04em',
        color: 'var(--c-accent)', background: 'transparent',
        border: '1px solid var(--c-accent-dim)', borderRadius: 4,
        padding: '4px 10px', cursor: 'pointer',
        transition: 'all 0.12s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-accent-muted)'; e.currentTarget.style.borderColor = 'var(--c-accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--c-accent-dim)'; }}
    >
      Open in {label} →
    </button>
  );
}
