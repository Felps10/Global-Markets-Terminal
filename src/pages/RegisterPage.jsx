import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { ROUTES } from '../lib/routes.js';
import {
  resolvePostAuthTarget, inputBase, labelBase,
  EyeIcon, AuthStyles, AuthLeftPanel,
} from './authShared.jsx';

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

// ── Password requirements (labels resolve via i18n at render) ───────────────
const PW_REQS = [
  { key: 'auth.req_length', test: pw => pw.length >= 8 },
  { key: 'auth.req_upper', test: pw => /[A-Z]/.test(pw) },
  { key: 'auth.req_number', test: pw => /[0-9]/.test(pw) },
  { key: 'auth.req_special', test: pw => SPECIAL_RE.test(pw) },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Where the visitor was headed before ProtectedRoute sent them into auth.
  const from = location.state?.from;

  const strength = getStrength(password);
  const canSubmit = name && email && password && confirmPassword && !submitting;

  // Already signed in — skip the form entirely (render-time, no flash).
  if (isAuthenticated) {
    return <Navigate to={resolvePostAuthTarget(from, user?.role)} replace />;
  }

  function validate() {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) errs.name = t('auth.err_name');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('auth.err_email');
    if (!password || password.length < 8) errs.password = t('auth.err_password_length');
    else if (!/[A-Z]/.test(password)) errs.password = t('auth.err_password_upper');
    else if (!/[0-9]/.test(password)) errs.password = t('auth.err_password_number');
    else if (!SPECIAL_RE.test(password)) errs.password = t('auth.err_password_special');
    if (password !== confirmPassword) errs.confirmPassword = t('auth.err_password_match');
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
        navigate(resolvePostAuthTarget(from, 'user'), { replace: true });
      } else {
        const err = result.error;
        if (err?.error === 'EMAIL_TAKEN') {
          setError(t('auth.err_email_taken'));
        } else if (err?.error === 'TOO_MANY_REQUESTS') {
          setError(t('auth.err_rate_limit'));
        } else {
          setError(err?.message || t('auth.err_generic'));
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

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
      <AuthStyles />
      <div className="gmt-auth-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 52px - 138px)', // viewport minus fixed header (52, reserved by PublicLayout) and footer (~138)
      }}>
        <AuthLeftPanel taglineKey="auth.register_tagline" />

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
              {t('auth.register_title')}
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              {t('auth.register_sub')}
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
                <label style={labelBase}>{t('auth.name_label')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  // no autoFocus: the browser scrolls the focused input into
                  // view on load, jumping past the page heading
                  autoComplete="name"
                  style={{ ...inputBase, border: getBorder(fieldErrors.name, nameFocused) }}
                />
                {fieldErrors.name && <div style={fieldErrorStyle}>{fieldErrors.name}</div>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>{t('auth.email_label')}</label>
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
                <label style={labelBase}>{t('auth.password_label')}</label>
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
                    aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                    style={eyeBtn}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    <EyeIcon open={showPassword} />
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
                      {strength > 0 ? t(`auth.strength_${strength}`) : ''}
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
                          {t(req.key)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {fieldErrors.password && <div style={fieldErrorStyle}>{fieldErrors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>{t('auth.confirm_label')}</label>
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
                    aria-label={showConfirm ? t('auth.hide_password') : t('auth.show_password')}
                    style={eyeBtn}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    <EyeIcon open={showConfirm} />
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
                {submitting ? t('auth.creating') : t('common.create_account')}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
            }}>
              {t('common.already_have_account')}{' '}
              <button
                onClick={() => navigate(ROUTES.auth.login, { state: { from } })}
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
                {t('common.sign_in_arrow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
