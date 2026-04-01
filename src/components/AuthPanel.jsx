/**
 * AuthPanel — slide-in registration and login panel
 *
 * Overlays the current page from the right. Guest registers or logs in,
 * panel closes, and they continue exactly where they were — now authenticated.
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { trackEvent, identifyUser } from '../services/analytics.js';

// ─── Message map (from docs/guest-access-spec.md) ────────────────────────────
const MESSAGES = {
  watchlist:       'Salve ativos na sua watchlist — crie uma conta gratuita',
  alerts:          'Receba alertas de preço em tempo real — crie uma conta gratuita',
  fundamentals:    'Acesse dados fundamentalistas completos — crie uma conta gratuita',
  signals:         'Acesse sinais técnicos (RSI, MACD) — crie uma conta gratuita',
  news:            'Acesse o feed completo de notícias — crie uma conta gratuita',
  chart_center:    'Charts interativos e comparações — crie uma conta gratuita',
  research:        'Terminal de pesquisa aprofundada — crie uma conta gratuita',
  fundamental_lab: 'Laboratório de valuation e métricas — crie uma conta gratuita',
  macro_hub:       'Dashboards macro e calendário econômico — crie uma conta gratuita',
  signal_engine:   'Scanner de sinais técnicos — crie uma conta gratuita',
  clube:           'Gestão de clube de investimento — crie uma conta gratuita',
  default:         'Crie uma conta gratuita para continuar',
};

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: 7,
  color: '#e2e8f0',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 13,
  padding: '10px 14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const inputFocusStyle = {
  ...inputStyle,
  border: '0.5px solid rgba(255,255,255,0.3)',
};

const primaryBtnStyle = {
  width: '100%',
  background: '#fff',
  border: 'none',
  borderRadius: 7,
  color: '#080f1a',
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  padding: '11px',
  marginTop: 4,
  transition: 'background 0.15s',
};

const labelStyle = {
  display: 'block',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  letterSpacing: '0.02em',
};

// ─── FocusInput — input with focus border state ──────────────────────────────
function FocusInput({ type = 'text', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      {...props}
      style={focused ? inputFocusStyle : inputStyle}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

// ─── PasswordInput — with show/hide toggle ───────────────────────────────────
function PasswordInput(props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        {...props}
        style={focused ? inputFocusStyle : inputStyle}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 12,
          fontFamily: "'IBM Plex Sans', sans-serif",
          padding: '2px 4px',
        }}
      >
        {show ? t('auth_panel.hide') : t('auth_panel.show')}
      </button>
    </div>
  );
}

// ─── GmtLogoSmall ────────────────────────────────────────────────────────────
function GmtLogoSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <rect width="22" height="22" rx="4" fill="rgba(59,130,246,0.15)" />
      <rect x="3" y="14" width="3" height="5" rx="1" fill="var(--c-accent)" />
      <rect x="7" y="10" width="3" height="9" rx="1" fill="var(--c-accent)" opacity="0.85" />
      <rect x="11" y="6" width="3" height="13" rx="1" fill="var(--c-accent)" opacity="0.7" />
      <rect x="15" y="3" width="3" height="16" rx="1" fill="var(--c-accent)" opacity="0.55" />
    </svg>
  );
}

// ─── AuthPanel ───────────────────────────────────────────────────────────────
export default function AuthPanel({ isOpen, onClose, featureName, onSuccess }) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [view, setView] = useState('register');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Reset form state when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      setView('register');
      setError('');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLoginEmail('');
      setLoginPassword('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Register handler ───────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name || name.trim().length < 2) {
      setError(t('auth_panel.error_name'));
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth_panel.error_email'));
      return;
    }
    if (!password || password.length < 8) {
      setError(t('auth_panel.error_pw_length'));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError(t('auth_panel.error_pw_upper'));
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError(t('auth_panel.error_pw_digit'));
      return;
    }
    if (!SPECIAL_RE.test(password)) {
      setError(t('auth_panel.error_pw_special'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth_panel.error_pw_match'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(name.trim(), email.trim(), password, confirmPassword);
      if (!result.success) {
        setError(result.error?.message || result.error?.error || t('auth_panel.error_register'));
        setSubmitting(false);
        return;
      }
      // Success
      identifyUser(result.user?.id || email, { role: 'user', email });
      trackEvent('guest_conversion', { featureName });
      onSuccess?.();
    } catch (err) {
      setError(err.message || t('auth_panel.error_register'));
      setSubmitting(false);
    }
  }

  // ── Login handler ──────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (!loginEmail) {
      setError(t('auth_panel.error_login_email'));
      return;
    }
    if (!loginPassword) {
      setError(t('auth_panel.error_login_pw'));
      return;
    }

    setSubmitting(true);
    try {
      const data = await login(loginEmail.trim(), loginPassword);
      identifyUser(data.user?.id || loginEmail, { role: data.user?.user_metadata?.role || 'user', email: loginEmail });
      onSuccess?.();
    } catch (err) {
      setError(err.message || t('auth_panel.error_login'));
      setSubmitting(false);
    }
  }

  const message = MESSAGES[featureName] || MESSAGES.default;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          minHeight: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 400,
        maxWidth: '100%',
        height: '100vh',
        zIndex: 201,
        background: '#0c1525',
        borderLeft: '0.5px solid rgba(255,255,255,0.1)',
        overflowY: 'auto',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          ×
        </button>

        {/* Content */}
        <div style={{ padding: '48px 32px 32px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <GmtLogoSmall />
          </div>

          {/* Feature message */}
          <div style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: 280,
            margin: '0 auto 28px',
          }}>
            {message}
          </div>

          {/* ── Register View ────────────────────────────────────────── */}
          {view === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('auth_panel.name_label')}</label>
                <FocusInput
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('auth_panel.name_placeholder')}
                  autoComplete="name"
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('auth_panel.email_label')}</label>
                <FocusInput
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth_panel.email_placeholder')}
                  autoComplete="email"
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('auth_panel.password_label')}</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth_panel.password_placeholder')}
                  autoComplete="new-password"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('auth_panel.confirm_label')}</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('auth_panel.confirm_placeholder')}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12,
                  color: '#f87171',
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...primaryBtnStyle,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                {submitting ? t('auth_panel.registering_btn') : t('auth_panel.register_btn')}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: 20,
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
              }}>
                {t('auth_panel.switch_to_login')}{' '}
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12,
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {t('auth_panel.switch_to_login_link')}
                </button>
              </div>
            </form>
          )}

          {/* ── Login View ───────────────────────────────────────────── */}
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('auth_panel.email_label')}</label>
                <FocusInput
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder={t('auth_panel.email_placeholder')}
                  autoComplete="email"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('auth_panel.password_label')}</label>
                <PasswordInput
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder={t('auth_panel.password_login_placeholder')}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12,
                  color: '#f87171',
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...primaryBtnStyle,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                {submitting ? t('auth_panel.logging_btn') : t('auth_panel.login_btn')}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: 20,
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
              }}>
                {t('auth_panel.switch_to_register')}{' '}
                <button
                  type="button"
                  onClick={() => { setView('register'); setError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12,
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {t('auth_panel.switch_to_register_link')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
