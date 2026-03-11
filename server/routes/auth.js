import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db.js';
import { authenticate, JWT_SECRET, JWT_EXPIRES_IN } from '../middleware/auth.js';

const router = Router();

// ── Rate limiter for registration ──────────────────────────────────────────────
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error:   'TOO_MANY_REQUESTS',
      message: 'Too many signup attempts. Try again later.',
    }),
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function makeToken(user) {
  const payload = { id: user.id, email: user.email, name: user.name || '', role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ── POST /api/v1/auth/register ─────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, confirmPassword, name } = req.body;

  // Validate name
  const trimmedName = (name || '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Name must be 2–50 characters.' });
  }
  // Validate email
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'VALIDATION', message: 'A valid email address is required.' });
  }
  // Validate password strength
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must be at least 8 characters.' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one uppercase letter.' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one number.' });
  }
  if (!SPECIAL_RE.test(password)) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Password must contain at least one special character.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Passwords do not match.' });
  }

  const db = getDb();
  const lowerEmail = email.toLowerCase();

  // Duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(lowerEmail);
  if (existing) {
    return res.status(409).json({
      error:   'EMAIL_TAKEN',
      message: 'An account with this email already exists.',
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const info = db
      .prepare(`INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'user')`)
      .run(lowerEmail, hash, trimmedName);

    const user  = { id: info.lastInsertRowid, email: lowerEmail, name: trimmedName, role: 'user' };
    const token = makeToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/v1/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'email and password are required' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const token = makeToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name || '', role: user.role } });
});

// ── POST /api/v1/auth/logout  — client-side only ───────────────────────────────
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// ── GET /api/v1/auth/me ────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
