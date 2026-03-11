import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/groups
router.get('/', (req, res) => {
  const db     = getDb();
  const groups = db.prepare(`
    SELECT g.*,
           COUNT(s.id) AS subgroup_count
    FROM   groups g
    LEFT   JOIN subgroups s ON s.group_id = g.id
    GROUP  BY g.id
    ORDER  BY g.display_name
  `).all();
  res.json(groups);
});

// GET /api/v1/groups/:id
router.get('/:id', (req, res) => {
  const db    = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });
  res.json(group);
});

// POST /api/v1/groups
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { display_name, description, slug } = req.body;
  if (!display_name || !slug) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'display_name and slug are required' });
  }

  const db = getDb();
  const id = slug;

  // Check slug uniqueness
  const existing = db.prepare('SELECT id FROM groups WHERE slug = ?').get(slug);
  if (existing) {
    return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
  }

  try {
    db.prepare(`
      INSERT INTO groups (id, display_name, description, slug) VALUES (?, ?, ?, ?)
    `).run(id, display_name, description || null, slug);

    const created = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// PUT /api/v1/groups/:id
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { display_name, description, slug } = req.body;
  const db = getDb();

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });

  if (slug && slug !== group.slug) {
    const conflict = db.prepare('SELECT id FROM groups WHERE slug = ? AND id != ?').get(slug, req.params.id);
    if (conflict) {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
    }
  }

  const newSlug        = slug         || group.slug;
  const newDisplayName = display_name || group.display_name;
  const newDescription = description  !== undefined ? description : group.description;

  db.prepare(`
    UPDATE groups
    SET display_name = ?, description = ?, slug = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newDisplayName, newDescription, newSlug, req.params.id);

  const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/v1/groups/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });

  const subgroupCount = db.prepare('SELECT COUNT(*) as n FROM subgroups WHERE group_id = ?').get(req.params.id).n;
  if (subgroupCount > 0) {
    return res.status(409).json({
      error:         'GROUP_HAS_SUBGROUPS',
      message:       `This group contains ${subgroupCount} subgroup(s). Remove them before deleting.`,
      subgroupCount,
    });
  }

  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
