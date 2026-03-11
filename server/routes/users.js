import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

// ─── GET /api/v1/users/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db   = getDb();
  const user = db.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).get(Number(req.params.id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// ─── DELETE /api/v1/users/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.id === targetId) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

export default router;
