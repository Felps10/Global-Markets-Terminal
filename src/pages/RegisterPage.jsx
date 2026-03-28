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

// ── Password strength helpers ────────────────────────────────────────────────
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function getStrength(pw) {
  if (!pw || pw.length < 8) return 0;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && SPECIAL_RE.test(pw)) return 3;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 2;
  return 1;
}

const STRENGTH_META = [
  { label: 'Weak',        color: '#FF5252' },
  { label: 'Fair',        color: '#FF9100' },
  { label: 'Strong',      color: '#FFD740' },
  { label: 'Very Strong', color: '#00E676' },
];

// ── Eye Icon SVGs ────────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Shared inline style helpers ──────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.15em', color: C.muted,
  textTransform: 'uppercase', marginBottom: 8,
};

function inputStyle(hasError, hasToggle) {
  return {
    width: '100%', background: C.bg,
    border: `1px solid ${hasError ? C.error : C.border}`,
    borderRadius: 4, color: C.text, fontFamily: MONO,
    fontSize: 13, padding: '10px 14px',
    paddingRight: hasToggle ? 40 : 14,
    outline: 'none', boxSizing: 'border-box',
  };
}

const eyeBtnStyle = {
  position: 'absolute', right: 10, top: '50%',
  transform: 'translateY(-50%)', background: 'none',
  border: 'none', color: C.muted, cursor: 'pointer',
  padding: 4, display: 'flex', alignItems: 'center',
};

const fieldErrorStyle = {
  fontSize: 10, color: C.error, marginTop: 6,
  letterSpacing: '0.04em',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [fieldErrors,     setFieldErrors]     = useState({});
  const [serverError,     setServerError]     = useState('');
  const [submitting,      setSubmitting]      = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  const strength = getStrength(password);
  const strengthMeta = STRENGTH_META[strength] || STRENGTH_META[0];

  // Client-side validation
  function validate() {
    const errs = {};
    if (!name.trim() || name.trim().length < 2)  errs.name = 'Name must be at least 2 characters.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!password || password.length < 8)         errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(password))            errs.password = 'Password needs at least one uppercase letter.';
    else if (!/[0-9]/.test(password))            errs.password = 'Password needs at least one number.';
    else if (!SPECIAL_RE.test(password))         errs.password = 'Password needs at least one special character.';
    if (password !== confirmPassword)             errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await register(name, email, password, confirmPassword);
      if (result.success) {
        navigate('/app', { replace: true });
      } else {
        const err = result.error;
        if (err?.error === 'EMAIL_TAKEN') {
          setServerError('This email is already registered. Try logging in.');
        } else if (err?.error === 'TOO_MANY_REQUESTS') {
          setServerError('Too many attempts. Please wait 15 minutes.');
        } else {
          setServerError(err?.message || 'Something went wrong. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name && email && password && confirmPassword && !submitting;
  const disabled = !canSubmit;

  return (
    <>
    <GMTPublicHeader onSignIn={() => navigate('/login')} onSignUp={() => {}} />
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'flex-start', justifyContent: 'center',
      fontFamily: MONO, padding: '40px 20px', paddingTop: 60,
    }}>
      <div style={{ width: '440px', maxWidth: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <Link to="/" style={{
            display: 'inline-block', fontSize: 10,
            letterSpacing: '0.12em', color: C.muted,
            textDecoration: 'none', textTransform: 'uppercase',
            marginBottom: 20, transition: 'color 0.15s',
          }}>
            ← Back to Terminal
          </Link>
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
            Create Account
          </h1>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Join the Global Markets Terminal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: 32,
        }}>
          {serverError && (
            <div style={{
              background: C.errorBg, border: `1px solid ${C.errorBorder}`,
              borderRadius: 4, color: C.error, fontSize: 12,
              padding: '10px 14px', marginBottom: 20,
            }}>
              ⚠ {serverError}
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
              autoFocus
              style={inputStyle(!!fieldErrors.name, false)}
            />
            {fieldErrors.name && <div style={fieldErrorStyle}>{fieldErrors.name}</div>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
              style={inputStyle(!!fieldErrors.email, false)}
            />
            {fieldErrors.email && <div style={fieldErrorStyle}>{fieldErrors.email}</div>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 chars, uppercase, number, symbol"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                style={inputStyle(!!fieldErrors.password, true)}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtnStyle}>
                {showPw ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
            {/* Strength indicator */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      height: 3, flex: 1, borderRadius: 2,
                      background: i <= strength ? strengthMeta.color : C.border,
                    }} />
                  ))}
                </div>
                <div style={{
                  fontSize: 9, letterSpacing: '0.1em',
                  color: strengthMeta.color, textTransform: 'uppercase',
                }}>
                  {strengthMeta.label}
                </div>
              </div>
            )}
            {fieldErrors.password && <div style={fieldErrorStyle}>{fieldErrors.password}</div>}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                style={inputStyle(!!fieldErrors.confirmPassword, true)}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeBtnStyle}>
                {showConfirm ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <div style={fieldErrorStyle}>{fieldErrors.confirmPassword}</div>}
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
            {submitting ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: 11, color: C.muted,
          marginTop: 24, letterSpacing: '0.04em',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: C.accent, textDecoration: 'none' }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}
