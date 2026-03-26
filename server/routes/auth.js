import { Router }       from 'express';
import rateLimit        from 'express-rate-limit';
import { supabase }     from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:    5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => res.status(429).json({
    error:   'TOO_MANY_REQUESTS',
    message: 'Too many signup attempts. Try again later.',
  }),
});

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

// POST /api/v1/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, confirmPassword, name } = req.body;

  const trimmedName = (name || '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 50)
    return res.status(400).json({ error: 'VALIDATION', message: 'Name must be 2–50 characters.' });
  if (!email || !EMAIL_RE.test(email))
    return res.status(400).json({ error: 'VALIDATION', message: 'A valid email address is required.' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(password))
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one uppercase letter.' });
  if (!/[0-9]/.test(password))
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one number.' });
  if (!SPECIAL_RE.test(password))
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one special character.' });
  if (password !== confirmPassword)
    return res.status(400).json({ error: 'VALIDATION', message: 'Passwords do not match.' });

  const { data, error } = await supabase.auth.admin.createUser({
    email:         email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: trimmedName, role: 'user' },
  });

  if (error) {
    if (error.message?.includes('already registered')) {
      return res.status(409).json({
        error:   'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      });
    }
    return res.status(500).json({
      error:   'SERVER_ERROR',
      message: 'Registration failed. Please try again.',
    });
  }

  // Return the created user — the client handles sign-in via
  // supabase.auth.signInWithPassword() in AuthContext.register().
  // Do NOT call signInWithPassword here: the server uses a service-role
  // client, which would create an unused server-side session.
  return res.status(201).json({
    user: {
      id:    data.user.id,
      email: data.user.email,
      name:  trimmedName,
      role:  'user',
    },
  });
});

// POST /api/v1/auth/login
// NOTE: The current frontend (AuthContext.login) calls supabase.auth.signInWithPassword()
// directly on the browser client — it does NOT hit this endpoint. This route is retained
// for backward compatibility and potential API-client usage.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      error:   'BAD_REQUEST',
      message: 'email and password are required',
    });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return res.status(401).json({
      error:   'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  return res.json({
    token: data.session.access_token,
    user: {
      id:    data.user.id,
      email: data.user.email,
      name:  data.user.user_metadata?.name || '',
      role:  data.user.user_metadata?.role || 'user',
    },
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
