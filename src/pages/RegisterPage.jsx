import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';

function getRedirectForRole(role) {
  if (role === 'admin') return '/admin';
  if (hasRole(role, 'club_member')) return '/clubes';
  return '/app/global';
}

// ── Password strength ───────────────────────────────────────────────────────
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function getStrength(pw) {
  if (!pw || pw.length < 8) return 0;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && SPECIAL_RE.test(pw)) return 4;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 3;
  if (pw.length >= 8 && /[A-Z]/.test(pw)) return 2;
  return 1;
}

const STRENGTH_COLORS = ['', 'var(--c-error)', '#fb923c', 'var(--c-accent)', '#00E676'];
const STRENGTH_LABELS = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG'];

// ── Small decorative globe ──────────────────────────────────────────────────
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

// ── Password requirements ───────────────────────────────────────────────────
const PW_REQS = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
  { label: 'One special character', test: pw => SPECIAL_RE.test(pw) },
];

export default function RegisterPage() {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(getRedirectForRole(user?.role), { replace: true });
  }, [isAuthenticated, navigate]);

  const strength = getStrength(password);
  const canSubmit = name && email && password && confirmPassword && !submitting;

  function validate() {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!password || password.length < 8) errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(password)) errs.password = 'Password needs at least one uppercase letter.';
    else if (!/[0-9]/.test(password)) errs.password = 'Password needs at least one number.';
    else if (!SPECIAL_RE.test(password)) errs.password = 'Password needs at least one special character.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await register(name, email, password, confirmPassword);
      if (result.success) {
        navigate('/app/global', { replace: true });
      } else {
        const err = result.error;
        if (err?.error === 'EMAIL_TAKEN') {
          setError('This email is already registered. Try logging in.');
        } else if (err?.error === 'TOO_MANY_REQUESTS') {
          setError('Too many attempts. Please wait 15 minutes.');
        } else {
          setError(err?.message || 'Something went wrong. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
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

  const fieldErrorStyle = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 10,
    color: 'var(--c-error)',
    marginTop: 6,
  };

  function getBorder(fieldError, focused) {
    if (fieldError) return '1px solid rgba(255,82,82,0.5)';
    if (focused) return '1px solid rgba(59,130,246,0.5)';
    return '1px solid rgba(255,255,255,0.08)';
  }

  const eyeBtn = {
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
            {'Join the terminal.\nBuilt for professionals.'}
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
              Create your account.
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              Free access. No credit card required.
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
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>FULL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  autoFocus
                  autoComplete="name"
                  style={{ ...inputBase, border: getBorder(fieldErrors.name, nameFocused) }}
                />
                {fieldErrors.name && <div style={fieldErrorStyle}>{fieldErrors.name}</div>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoComplete="email"
                  style={{ ...inputBase, border: getBorder(fieldErrors.email, emailFocused) }}
                />
                {fieldErrors.email && <div style={fieldErrorStyle}>{fieldErrors.email}</div>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    autoComplete="new-password"
                    style={{ ...inputBase, paddingRight: 44, border: getBorder(fieldErrors.password, passwordFocused) }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={eyeBtn}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    {showPassword
                      ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: 3, marginTop: 8, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          height: 3,
                          flex: 1,
                          borderRadius: 2,
                          background: i <= strength
                            ? STRENGTH_COLORS[strength]
                            : 'rgba(255,255,255,0.08)',
                        }} />
                      ))}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      color: STRENGTH_COLORS[strength] || 'rgba(255,255,255,0.2)',
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}>
                      {STRENGTH_LABELS[strength]}
                    </div>
                  </>
                )}

                {/* Requirements */}
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {PW_REQS.map((req, i) => {
                      const met = req.test(password);
                      return (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 4,
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 11,
                          color: met ? '#00E676' : 'rgba(255,255,255,0.25)',
                        }}>
                          <div style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: met ? '#00E676' : 'transparent',
                            border: met ? 'none' : '1px solid rgba(255,255,255,0.25)',
                            flexShrink: 0,
                          }} />
                          {req.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {fieldErrors.password && <div style={fieldErrorStyle}>{fieldErrors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>CONFIRM PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    autoComplete="new-password"
                    style={{ ...inputBase, paddingRight: 44, border: getBorder(fieldErrors.confirmPassword, confirmFocused) }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={eyeBtn}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    {showConfirm
                      ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {fieldErrors.confirmPassword && <div style={fieldErrorStyle}>{fieldErrors.confirmPassword}</div>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  width: '100%',
                  padding: 13,
                  marginTop: 24,
                  background: !canSubmit
                    ? 'rgba(255,255,255,0.05)'
                    : submitHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  color: !canSubmit ? 'rgba(255,255,255,0.2)' : '#080f1a',
                  border: 'none',
                  borderRadius: 4,
                  cursor: !canSubmit ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  transition: 'background 150ms',
                }}
              >
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
            }}>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
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
                Sign in →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
