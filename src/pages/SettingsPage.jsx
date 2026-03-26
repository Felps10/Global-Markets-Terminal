import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { usePreferences } from '../context/PreferencesContext.jsx';

const mono = "'JetBrains Mono', monospace";
const sans = "'DM Sans', sans-serif";

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: mono, fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)',
      letterSpacing: '1.5px', marginBottom: 16, paddingBottom: 8,
      borderBottom: '1px solid var(--c-border)',
    }}>
      {children}
    </div>
  );
}

function Row({ label, description, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20, gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: sans, fontSize: 13, color: 'var(--c-text)', fontWeight: 500 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--c-text-3)', marginTop: 3 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: mono, fontSize: 12, color: 'var(--c-text)',
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: 6, padding: '6px 28px 6px 10px', cursor: 'pointer',
        outline: 'none', appearance: 'none', minWidth: 140,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: mono, fontSize: 11, color: 'var(--c-text-3)' }}>
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <button onClick={onToggle}
        style={{
          width: 44, height: 24, borderRadius: 12, position: 'relative', padding: 0, cursor: 'pointer',
          background: theme === 'dark' ? 'rgba(0,230,118,0.2)' : 'rgba(99,102,241,0.2)',
          border: `1px solid ${theme === 'dark' ? '#00E67640' : 'rgba(99,102,241,0.4)'}`,
          transition: 'all 0.25s ease',
        }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', position: 'absolute', top: 3,
          left: theme === 'dark' ? 23 : 3,
          background: theme === 'dark' ? '#00E676' : '#6366f1',
          transition: 'left 0.25s ease',
        }} />
      </button>
    </div>
  );
}

function ReadOnlyField({ value }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: 12, color: 'var(--c-text-2)',
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
      borderRadius: 6, padding: '6px 12px', display: 'inline-block',
    }}>
      {value}
    </span>
  );
}

function Badge({ children, color = '#00E676' }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '1px',
      color, background: color + '18', border: `1px solid ${color}30`,
      borderRadius: 4, padding: '3px 8px',
    }}>
      {children}
    </span>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { prefs, updatePrefs } = usePreferences();
  const [savedKey, setSavedKey] = useState(null);

  const save = useCallback((partial) => {
    updatePrefs(partial);
    const key = Object.keys(partial)[0];
    setSavedKey(key);
    setTimeout(() => setSavedKey((prev) => prev === key ? null : prev), 2000);
  }, [updatePrefs]);

  const SavedIndicator = ({ field }) => {
    if (savedKey !== field) return null;
    return (
      <span style={{
        fontFamily: mono, fontSize: 10, color: '#00E676', marginLeft: 8,
        animation: 'fadeIn 0.2s ease',
      }}>
        ✓ Saved
      </span>
    );
  };

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto', padding: '40px 20px 60px',
      fontFamily: sans,
    }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <span style={{ fontSize: 20 }}>⚙</span>
        <h1 style={{
          fontFamily: mono, fontSize: 16, fontWeight: 700,
          color: 'var(--c-text)', letterSpacing: '2px', margin: 0,
        }}>
          SETTINGS
        </h1>
      </div>

      {/* Section 1 — Terminal */}
      <SectionLabel>TERMINAL</SectionLabel>
      <Row label="Default Terminal" description="Which terminal to open when you launch the app">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={prefs.defaultTerminal || 'global'}
            onChange={(v) => save({ defaultTerminal: v })}
            options={[
              { value: 'global', label: '🌐 Global' },
              { value: 'brasil', label: '🇧🇷 Brasil' },
            ]}
          />
          <SavedIndicator field="defaultTerminal" />
        </div>
      </Row>
      <Row label="Refresh Interval" description="How often market data is refreshed">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={String(prefs.refreshInterval || 30)}
            onChange={(v) => save({ refreshInterval: Number(v) })}
            options={[
              { value: '15', label: '15 seconds' },
              { value: '30', label: '30 seconds' },
              { value: '60', label: '60 seconds' },
            ]}
          />
          <SavedIndicator field="refreshInterval" />
        </div>
      </Row>

      <div style={{ height: 16 }} />

      {/* Section 2 — Appearance */}
      <SectionLabel>APPEARANCE</SectionLabel>
      <Row label="Theme" description="Dark or light terminal interface">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ThemeToggle
            theme={prefs.theme || 'dark'}
            onToggle={() => save({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
          />
          <SavedIndicator field="theme" />
        </div>
      </Row>
      <Row label="Language" description="Language support coming soon. This sets your preference for future updates.">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={prefs.language || 'en'}
            onChange={(v) => save({ language: v })}
            options={[
              { value: 'en',    label: 'English' },
              { value: 'pt-br', label: 'Português (BR)' },
            ]}
          />
          <SavedIndicator field="language" />
        </div>
      </Row>

      <div style={{ height: 16 }} />

      {/* Section 3 — Data */}
      <SectionLabel>DATA</SectionLabel>
      <Row label="Quota Dashboard" description="Monitor API usage, rate limits, and health status across all data providers.">
        <button
          onClick={() => navigate('/app/catalog')}
          style={{
            fontFamily: mono, fontSize: 11, fontWeight: 600, color: 'var(--c-text-2)',
            background: 'transparent', border: '1px solid var(--c-border)',
            borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
            letterSpacing: '0.5px', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = '#00E676'; e.target.style.color = '#00E676'; }}
          onMouseLeave={(e) => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.color = 'var(--c-text-2)'; }}
        >
          Open Quota Dashboard →
        </button>
      </Row>

      <div style={{ height: 16 }} />

      {/* Section 4 — Account */}
      <SectionLabel>ACCOUNT</SectionLabel>
      <Row label="Email">
        <ReadOnlyField value={user?.email || '—'} />
      </Row>
      <Row label="Role">
        <Badge color={user?.role === 'admin' ? '#f59e0b' : '#3b82f6'}>
          {(user?.role || 'user').toUpperCase()}
        </Badge>
      </Row>
      <Row label="Change Password" description="Password changes are managed through Supabase Auth.">
        <button
          onClick={() => {}}
          disabled
          style={{
            fontFamily: mono, fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)',
            background: 'transparent', border: '1px solid var(--c-border)',
            borderRadius: 6, padding: '8px 16px', cursor: 'not-allowed',
            letterSpacing: '0.5px', opacity: 0.5,
          }}
        >
          Contact Admin
        </button>
      </Row>
    </div>
  );
}
