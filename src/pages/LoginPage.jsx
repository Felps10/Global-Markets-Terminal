import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';

function getRedirectForRole(role) {
  if (role === 'admin') return '/admin';
  if (hasRole(role, 'club_member')) return '/clubes';
  return '/app/global';
}

// ── Small decorative globe (same as landing hero, scaled to 200×200) ────────
function MiniGlobe() {
  return (
    <svg viewBox="0 0 200 200" width={160} height={160} style={{ opacity: 0.35 }}>
      <circle cx={100} cy={100} r={80} stroke="var(--c-accent)" strokeWidth={1} fill="none" opacity={0.6} />
      <ellipse cx={100} cy={55}  rx={80} ry={20} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={72}  rx={80} ry={45} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={100} rx={80} ry={80} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={128} rx={80} ry={45} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={145} rx={80} ry={20} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      {[0, 30, 60, 90, 120, 150].map(deg => (
        <ellipse key={deg} cx={100} cy={100} rx={80} ry={80}
          fill="none" stroke="var(--c-accent)" strokeWidth={0.5} opacity={0.2}
          transform={`rotate(${deg}, 100, 100)`} />
      ))}
      {[
        [100, 20], [100, 180], [20, 100], [180, 100], [65, 57], [135, 57],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2} fill="var(--c-accent)" opacity={0.5} />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);

  // Redirect already-authenticated users to their role-appropriate page
  useEffect(() => {
    if (isAuthenticated) navigate(getRedirectForRole(user?.role), { replace: true });
  }, [isAuthenticated, user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data?.user?.user_metadata?.role || 'user';
      navigate(getRedirectForRole(role), { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  const inputBase = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    padding: '11px 14px',
    outline: 'none',
    transition: 'border-color 150ms',
  };

  const labelBase = {
    display: 'block',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    marginBottom: 8,
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gmt-form-panel { animation: fadeInUp 280ms ease both; }
      `}</style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 86px - 80px)',
      }}>
        {/* LEFT PANEL */}
        <div style={{
          background: '#040810',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <MiniGlobe />
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.25)',
            marginTop: 24,
            textAlign: 'center',
          }}>
            GMT
          </div>
          <div style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
            marginTop: 8,
          }}>
            {'Institutional market intelligence\nfor serious investors.'}
          </div>
          <div style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            gap: 24,
          }}>
            {[
              { num: '269', label: 'ASSETS' },
              { num: '8', label: 'SOURCES' },
              { num: '30s', label: 'REFRESH' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(59,130,246,0.5)',
                }}>{s.num}</span>
                <span style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          background: '#080f1a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 48px',
        }}>
          <div className="gmt-form-panel" style={{ width: '100%', maxWidth: 400 }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 28,
              color: 'rgba(255,255,255,0.92)',
              marginBottom: 8,
              marginTop: 0,
            }}>
              Welcome back.
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              Sign in to your GMT account.
            </p>

            {error && (
              <div style={{
                background: 'var(--c-error-dim)',
                border: '1px solid rgba(255,82,82,0.25)',
                borderRadius: 4,
                padding: '10px 14px',
                marginBottom: 20,
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                color: 'var(--c-error)',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoFocus
                  required
                  autoComplete="email"
                  style={{
                    ...inputBase,
                    border: error
                      ? '1px solid rgba(255,82,82,0.5)'
                      : emailFocused
                        ? '1px solid rgba(59,130,246,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoComplete="current-password"
                    style={{
                      ...inputBase,
                      paddingRight: 44,
                      border: error
                        ? '1px solid rgba(255,82,82,0.5)'
                        : passwordFocused
                          ? '1px solid rgba(59,130,246,0.5)'
                          : '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: 'rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    {showPassword
                      ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  width: '100%',
                  padding: 13,
                  marginTop: 24,
                  background: loading
                    ? 'rgba(59,130,246,0.4)'
                    : submitHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  color: '#080f1a',
                  border: 'none',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  transition: 'background 150ms',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
            }}>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12,
                  color: 'var(--c-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--c-accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--c-accent)'}
              >
                Create one →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
