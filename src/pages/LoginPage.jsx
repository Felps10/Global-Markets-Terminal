import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { GMTPublicHeader } from '../components/GMTHeader.jsx';

const C = {
  bg:        '#080C18',
  surface:   '#0D1220',
  border:    '#1E2740',
  accent:    '#00BCD4',
  text:      '#E8EAF0',
  muted:     '#4A5568',
  hint:      '#2D3748',
  error:     '#FF5252',
  errorBg:   'rgba(255,82,82,0.08)',
  errorBorder:'rgba(255,82,82,0.3)',
};

const MONO  = "'Space Mono', 'Courier New', monospace";
const SANS  = "'DM Sans', sans-serif";

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const id = 'gmt-cursor-style';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .gmt-cursor { display:inline-block; width:8px; height:14px;
        background:#00BCD4; vertical-align:middle; margin-left:2px;
        animation:blink 1.2s step-end infinite; }
    `;
    document.head.appendChild(el);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data?.user?.user_metadata?.role || 'user';
      navigate(role === 'admin' ? '/admin/taxonomy' : '/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  const hasError = !!error;
  const disabled = loading || !email || !password;

  return (
    <>
    <GMTPublicHeader onSignIn={() => {}} onSignUp={() => navigate('/register')} />
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'flex-start', justifyContent: 'center',
      fontFamily: MONO, padding: '40px 20px', paddingTop: 60,
    }}>
      <div style={{ width: '420px', maxWidth: '100%' }}>
        {/* Back link */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Link to="/" style={{
            display: 'inline-block', fontSize: 10,
            letterSpacing: '0.12em', color: C.muted,
            textDecoration: 'none', textTransform: 'uppercase',
            marginBottom: 20, transition: 'color 0.15s',
          }}>
            ← Back to Terminal
          </Link>
        </div>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{
            fontFamily: SANS, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.25em', color: C.accent,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Markets Terminal
          </div>
          <h1 style={{
            fontFamily: SANS, fontSize: 22, fontWeight: 700,
            color: C.text, margin: '0 0 4px',
          }}>
            Welcome Back<span className="gmt-cursor" />
          </h1>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Sign in to your GMT account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: 32,
        }}>
          {error && (
            <div style={{
              background: C.errorBg, border: `1px solid ${C.errorBorder}`,
              borderRadius: 4, color: C.error, fontSize: 12,
              padding: '10px 14px', marginBottom: 20,
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.15em', color: C.muted,
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%', background: C.bg,
                border: `1px solid ${hasError ? C.error : C.border}`,
                borderRadius: 4, color: C.text, fontFamily: MONO,
                fontSize: 13, padding: '10px 14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.15em', color: C.muted,
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: C.bg,
                border: `1px solid ${hasError ? C.error : C.border}`,
                borderRadius: 4, color: C.text, fontFamily: MONO,
                fontSize: 13, padding: '10px 14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button type="submit" disabled={disabled} style={{
            width: '100%', background: disabled ? C.border : C.accent,
            border: 'none', borderRadius: 4,
            color: disabled ? C.muted : C.bg,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: MONO, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.1em', padding: 12,
            textTransform: 'uppercase',
          }}>
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: 10, color: C.hint,
          marginTop: 24, letterSpacing: '0.05em',
        }}>
          Global Markets Terminal · Real-time market intelligence
        </p>
        <p style={{
          textAlign: 'center', fontSize: 11, color: C.muted,
          marginTop: 16, letterSpacing: '0.04em',
        }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: C.accent, textDecoration: 'none' }}>
            Sign up →
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}
