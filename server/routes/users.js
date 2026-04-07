import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { ADMIN_ASSIGNABLE, MANAGER_ASSIGNABLE } from '../lib/roles.js';

const router = Router();

// GET /api/v1/users
router.get('/', authenticate, requireAdmin, async (_req, res) => {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  const mapped = users.map((u) => ({
    id:              u.id,
    email:           u.email,
    name:            u.user_metadata?.name || '',
    role:            u.user_metadata?.role || 'user',
    created_at:      u.created_at,
    last_sign_in_at: u.last_sign_in_at || null,
  }));

  res.json({ users: mapped });
});

// DELETE /api/v1/users/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const targetId = req.params.id;

  if (req.user.id === targetId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot delete your own account' });
  }

  // Fetch target user to check their role before deleting
  const { data: { user: target }, error: fetchError } = await supabase.auth.admin.getUserById(targetId);
  if (fetchError || !target) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  }

  if ((target.user_metadata?.role || 'user') === 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot delete another admin account' });
  }

  const { error } = await supabase.auth.admin.deleteUser(targetId);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json({ ok: true });
});

// GET /api/v1/users/search?email=
router.get('/search', authenticate, requireAdmin, async (req, res) => {
  const { email } = req.query;

  if (!email || email.trim().length < 3) {
    return res.status(400).json({
      error:   'BAD_REQUEST',
      message: 'email query param required (min 3 chars)',
    });
  }

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  const needle  = email.trim().toLowerCase();
  const matches = users
    .filter(u => u.email?.toLowerCase().startsWith(needle))
    .slice(0, 5)
    .map(u => ({
      id:    u.id,
      email: u.email,
      name:  u.user_metadata?.name || '',
      role:  u.user_metadata?.role || 'user',
    }));

  return res.json({ users: matches });
});

// PATCH /api/v1/users/:id/role
router.patch('/:id/role', authenticate, requireAdmin, async (req, res) => {
  const targetId   = req.params.id;
  const { role }   = req.body;
  const callerRole = req.user.role;

  const assignable = callerRole === 'admin' ? ADMIN_ASSIGNABLE : MANAGER_ASSIGNABLE;

  if (!role || !assignable.includes(role)) {
    return res.status(400).json({
      error:   'BAD_REQUEST',
      message: `Role must be one of: ${assignable.join(', ')}`,
    });
  }

  if (req.user.id === targetId) {
    return res.status(403).json({
      error:   'FORBIDDEN',
      message: 'Cannot change your own role',
    });
  }

  const { data: { user: target }, error: fetchError } =
    await supabase.auth.admin.getUserById(targetId);

  if (fetchError || !target) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  }

  if ((target.user_metadata?.role || 'user') === 'admin' && callerRole !== 'admin') {
    return res.status(403).json({
      error:   'FORBIDDEN',
      message: 'Cannot modify an admin account',
    });
  }

  const { data: { user: updated }, error } =
    await supabase.auth.admin.updateUserById(targetId, {
      user_metadata: { ...target.user_metadata, role, notification_pending: true },
    });

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  return res.json({
    id:    updated.id,
    email: updated.email,
    name:  updated.user_metadata?.name || '',
    role:  updated.user_metadata?.role || 'user',
  });
});

// POST /api/v1/users/:id/promote-manager
// Admin-only. Promotes a user to club_manager. Only one club_manager allowed.
router.post('/:id/promote-manager', authenticate, requireAdmin, async (req, res) => {
  const targetId = req.params.id;

  // Check for existing club_manager
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) return res.status(500).json({ error: 'DB_ERROR', message: listErr.message });

  const existingManager = users.find(
    u => (u.user_metadata?.role || 'user') === 'club_manager'
  );
  if (existingManager) {
    return res.status(409).json({
      error:   'CONFLICT',
      message: 'A club_manager already exists',
      existing_manager: { id: existingManager.id, email: existingManager.email },
    });
  }

  const { data: { user: target }, error: fetchError } =
    await supabase.auth.admin.getUserById(targetId);
  if (fetchError || !target) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  }

  const { data: { user: updated }, error } =
    await supabase.auth.admin.updateUserById(targetId, {
      user_metadata: { ...target.user_metadata, role: 'club_manager', notification_pending: true },
    });

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  return res.json({
    id:    updated.id,
    email: updated.email,
    name:  updated.user_metadata?.name || '',
    role:  updated.user_metadata?.role || 'user',
  });
});

export default router;
