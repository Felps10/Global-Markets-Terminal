import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { authenticate, JWT_SECRET, JWT_EXPIRES_IN } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'email and password are required' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({ token, user: payload });
});

// POST /api/v1/auth/logout  — client-side only, nothing to invalidate
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
