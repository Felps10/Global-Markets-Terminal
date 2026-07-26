import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { ROUTES } from '../lib/routes.js';
import {
  resolvePostAuthTarget, inputBase, labelBase,
  EyeIcon, AuthStyles, AuthLeftPanel,
} from './authShared.jsx';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);

  // Where the visitor was headed before ProtectedRoute sent them here.
  const from = location.state?.from;

  // Already signed in — go straight to the origin (or role default) without
  // painting the form for a frame.
  if (isAuthenticated) {
    return <Navigate to={resolvePostAuthTarget(from, user?.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data?.user?.app_metadata?.role || 'user';
      navigate(resolvePostAuthTarget(from, role), { replace: true });
    } catch (err) {
      setError(err?.message || t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  }

  const fieldBorder = (focused) => focused
    ? '1px solid rgba(59,130,246,0.5)'
    : '1px solid rgba(255,255,255,0.08)';

  return (
    <>
      <AuthStyles />
      <div className="gmt-auth-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 52px - 138px)', // viewport minus fixed header (52, reserved by PublicLayout) and footer (~138)
      }}>
        <AuthLeftPanel taglineKey="auth.login_tagline" />

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
              {t('auth.login_title')}
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              {t('auth.login_sub')}
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
                <label style={labelBase}>{t('auth.email_label')}</label>
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
                    // A failed login is unattributed — the banner above carries
                    // the error; don't paint both fields red.
                    border: fieldBorder(emailFocused),
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>{t('auth.password_label')}</label>
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
                      border: fieldBorder(passwordFocused),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
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
                    <EyeIcon open={showPassword} />
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
                {loading ? t('auth.signing_in') : t('common.sign_in')}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
            }}>
              {t('auth.no_account')}{' '}
              <button
                onClick={() => navigate(ROUTES.auth.register, { state: { from } })}
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
                {t('auth.create_one')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
