import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../hooks/useAuth.js';

// ── Animations ─────────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Styled components (mirrors LoginPage aesthetic) ───────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: #080C18;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Mono', 'Courier New', monospace;
  padding: 40px 20px;
`;

const Panel = styled.div`
  width: 440px;
  animation: ${fadeIn} 0.4s ease;
`;

const Header = styled.div`
  margin-bottom: 32px;
  text-align: center;
`;

const BackLink = styled(Link)`
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: #4A5568;
  text-decoration: none;
  text-transform: uppercase;
  margin-bottom: 20px;
  transition: color 0.15s;
  &:hover { color: #8892A4; }
`;

const Logo = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #00BCD4;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #E8EAF0;
  margin: 0 0 4px;
  font-family: 'DM Sans', sans-serif;
`;

const Subtitle = styled.p`
  font-size: 12px;
  color: #4A5568;
  margin: 0;
`;

const Form = styled.form`
  background: #0D1220;
  border: 1px solid #1E2740;
  border-radius: 6px;
  padding: 32px;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: #4A5568;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const InputWrap = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  background: #080C18;
  border: 1px solid ${p => p.$error ? '#FF5252' : '#1E2740'};
  border-radius: 4px;
  color: #E8EAF0;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  padding: 10px 14px;
  padding-right: ${p => p.$hasToggle ? '40px' : '14px'};
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus { border-color: ${p => p.$error ? '#FF5252' : '#00BCD4'}; }
  &::placeholder { color: #2D3748; }
`;

const EyeBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #4A5568;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #8892A4; }
`;

const FieldError = styled.div`
  font-size: 10px;
  color: #FF5252;
  margin-top: 6px;
  letter-spacing: 0.04em;
`;

// Password strength bar
const StrengthWrap = styled.div`
  margin-top: 8px;
`;

const StrengthBar = styled.div`
  display: flex;
  gap: 3px;
  margin-bottom: 4px;
`;

const StrengthSegment = styled.div`
  height: 3px;
  flex: 1;
  border-radius: 2px;
  background: ${p => p.$active ? p.$color : '#1E2740'};
  transition: background 0.2s;
`;

const StrengthLabel = styled.div`
  font-size: 9px;
  letter-spacing: 0.1em;
  color: ${p => p.$color || '#4A5568'};
  text-transform: uppercase;
`;

const ErrorBanner = styled.div`
  background: rgba(255, 82, 82, 0.08);
  border: 1px solid rgba(255, 82, 82, 0.3);
  border-radius: 4px;
  color: #FF5252;
  font-size: 12px;
  padding: 10px 14px;
  margin-bottom: 20px;
`;

const SubmitBtn = styled.button`
  width: 100%;
  background: ${p => p.disabled ? '#1E2740' : '#00BCD4'};
  border: none;
  border-radius: 4px;
  color: ${p => p.disabled ? '#4A5568' : '#080C18'};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 12px;
  text-transform: uppercase;
  transition: background 0.15s, transform 0.1s;

  &:hover:not(:disabled) { background: #26C6DA; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
`;

const FooterText = styled.p`
  text-align: center;
  font-size: 11px;
  color: #4A5568;
  margin-top: 24px;
  letter-spacing: 0.04em;
`;

const InlineLink = styled(Link)`
  color: #00BCD4;
  text-decoration: none;
  &:hover { color: #26C6DA; }
`;

// ── Password strength helpers ──────────────────────────────────────────────────
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function getStrength(pw) {
  if (!pw || pw.length < 8) return 0;                              // Weak
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && SPECIAL_RE.test(pw)) return 3; // Very Strong
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw))   return 2; // Strong
  return 1;                                                        // Fair
}

const STRENGTH_META = [
  { label: 'Weak',        color: '#FF5252' },
  { label: 'Fair',        color: '#FF9100' },
  { label: 'Strong',      color: '#FFD740' },
  { label: 'Very Strong', color: '#00E676' },
];

// ── Eye Icon SVGs ──────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
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

  return (
    <Page>
      <Panel>
        <Header>
          <BackLink to="/">← Back to home</BackLink>
          <Logo>Markets Terminal</Logo>
          <Title>Create Account</Title>
          <Subtitle>Join the Global Markets Terminal</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          {serverError && <ErrorBanner>⚠ {serverError}</ErrorBanner>}

          {/* Name */}
          <Field>
            <Label>Full Name</Label>
            <Input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
              $error={!!fieldErrors.name}
              autoFocus
            />
            {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
          </Field>

          {/* Email */}
          <Field>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
              $error={!!fieldErrors.email}
            />
            {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
          </Field>

          {/* Password */}
          <Field>
            <Label>Password</Label>
            <InputWrap>
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 chars, uppercase, number, symbol"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                $error={!!fieldErrors.password}
                $hasToggle
              />
              <EyeBtn type="button" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff /> : <EyeOpen />}
              </EyeBtn>
            </InputWrap>
            {/* Strength indicator */}
            {password.length > 0 && (
              <StrengthWrap>
                <StrengthBar>
                  {[0,1,2,3].map(i => (
                    <StrengthSegment
                      key={i}
                      $active={i <= strength}
                      $color={strengthMeta.color}
                    />
                  ))}
                </StrengthBar>
                <StrengthLabel $color={strengthMeta.color}>{strengthMeta.label}</StrengthLabel>
              </StrengthWrap>
            )}
            {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
          </Field>

          {/* Confirm Password */}
          <Field>
            <Label>Confirm Password</Label>
            <InputWrap>
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                $error={!!fieldErrors.confirmPassword}
                $hasToggle
              />
              <EyeBtn type="button" onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff /> : <EyeOpen />}
              </EyeBtn>
            </InputWrap>
            {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
          </Field>

          <SubmitBtn type="submit" disabled={!canSubmit}>
            {submitting ? 'Creating Account...' : 'Create Account →'}
          </SubmitBtn>
        </Form>

        <FooterText>
          Already have an account?{' '}
          <InlineLink to="/login">Sign in →</InlineLink>
        </FooterText>
      </Panel>
    </Page>
  );
}
