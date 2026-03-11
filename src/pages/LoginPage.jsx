import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../hooks/useAuth.js';

// ── Animations ────────────────────────────────────────────────────────────────
const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Styled components ─────────────────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: #080C18;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Mono', 'Courier New', monospace;
`;

const Panel = styled.div`
  width: 420px;
  animation: ${fadeIn} 0.4s ease;
`;

const Header = styled.div`
  margin-bottom: 40px;
  text-align: center;
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

const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 14px;
  background: #00BCD4;
  vertical-align: middle;
  margin-left: 2px;
  animation: ${blink} 1.2s step-end infinite;
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

const Input = styled.input`
  width: 100%;
  background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px;
  color: #E8EAF0;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${(p) => (p.$error ? '#FF5252' : '#00BCD4')};
  }

  &::placeholder {
    color: #2D3748;
  }
`;

const ErrorMsg = styled.div`
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
  background: ${(p) => (p.disabled ? '#1E2740' : '#00BCD4')};
  border: none;
  border-radius: 4px;
  color: ${(p) => (p.disabled ? '#4A5568' : '#080C18')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 12px;
  text-transform: uppercase;
  transition: background 0.15s, transform 0.1s;

  &:hover:not(:disabled) {
    background: #26C6DA;
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const Footer = styled.p`
  text-align: center;
  font-size: 10px;
  color: #2D3748;
  margin-top: 24px;
  letter-spacing: 0.05em;
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/taxonomy', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Panel>
        <Header>
          <Logo>Markets Terminal</Logo>
          <Title>Admin Access<Cursor /></Title>
          <Subtitle>Authorized personnel only</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

          <Field>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="admin@terminal.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              $error={!!error}
              autoFocus
              required
            />
          </Field>

          <Field>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              $error={!!error}
              required
            />
          </Field>

          <SubmitBtn type="submit" disabled={loading || !email || !password}>
            {loading ? 'Authenticating...' : 'Sign In →'}
          </SubmitBtn>
        </Form>

        <Footer>No registration — accounts are managed by the system administrator</Footer>
      </Panel>
    </Page>
  );
}
